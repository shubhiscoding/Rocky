import { revalidatePath } from 'next/cache';

import {
  CoreTool,
  Message,
  NoSuchToolError,
  createDataStreamResponse,
  generateObject,
  smoothStream,
  streamText,
} from 'ai';
import { performance } from 'perf_hooks';
import { z } from 'zod';

import {
  defaultModel,
  defaultSystemPrompt,
  defaultTools,
  getToolsFromRequiredTools,
} from '@/ai/providers';
import { MAX_TOKEN_MESSAGES } from '@/lib/constants';
import { logWithTiming } from '@/lib/utils';
import {
  getConfirmationResult,
  getUnconfirmedConfirmationMessage,
  handleConfirmation,
} from '@/lib/utils/ai';
import { generateTitleFromUserMessage } from '@/server/actions/ai';
import { verifyUser } from '@/server/actions/user';
import {
  dbCreateConversation,
  dbCreateMessages,
  dbDeleteConversation,
  dbGetConversationMessages,
} from '@/server/db/queries';

export const maxDuration = 120;

export async function POST(req: Request) {
  const startTime = performance.now();

  const session = await verifyUser();
  const userId = session?.data?.data?.id;
  const publicKey = session?.data?.data?.publicKey;
  const degenMode = session?.data?.data?.degenMode;

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!publicKey) {
    console.error('[chat/route] No public key found');
    return new Response('No public key found', { status: 400 });
  }

  try {
    const { id: conversationId, message }: { id: string; message: Message } =
      await req.json();
    if (!message) return new Response('No message found', { status: 400 });
    logWithTiming(startTime, '[chat/route] message received');

    const existingMessages =
      (await dbGetConversationMessages({
        conversationId,
        limit: MAX_TOKEN_MESSAGES,
        isServer: true,
      })) ?? [];

    logWithTiming(startTime, '[chat/route] fetched existing messages');

    if (existingMessages.length === 0 && message.role !== 'user') {
      return new Response('No user message found', { status: 400 });
    }

    if (existingMessages.length === 0) {
      const title = await generateTitleFromUserMessage({
        message: message.content,
      });
      await dbCreateConversation({ conversationId, userId, title });
      revalidatePath('/api/conversations');
    }

    const newUserMessage =
      message.role === 'user'
        ? await dbCreateMessages({
            messages: [
              {
                conversationId,
                role: 'user',
                content: message.content,
                toolInvocations: [],
                experimental_attachments: message.experimental_attachments
                  ? JSON.parse(JSON.stringify(message.experimental_attachments))
                  : undefined,
              },
            ],
          })
        : null;

    const unconfirmed = getUnconfirmedConfirmationMessage(existingMessages);
    const { confirmationHandled, updates } = await handleConfirmation({
      current: message,
      unconfirmed,
    });
    logWithTiming(startTime, '[chat/route] handleConfirmation completed');

    const attachments = existingMessages
      .filter((m) => m.experimental_attachments)
      .flatMap((m) => m.experimental_attachments!)
      .map((a) => ({ type: a.contentType, data: a.url }));

    const systemPrompt = [
      defaultSystemPrompt,
      `History of attachments: ${JSON.stringify(attachments)}`,
      `User Solana wallet public key: ${publicKey}`,
      `User ID: ${userId}`,
      `Conversation ID: ${conversationId}`,
      `Degen Mode: ${degenMode}`,
    ].join('\n\n');

    const relevant = existingMessages
      .filter(
        (m) => !(m.content === '' && (m.toolInvocations?.length ?? 0) === 0),
      )
      .sort(
        (a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0),
      );

    const confirmationResult = getConfirmationResult(message);
    if (confirmationResult !== undefined) {
      relevant.push({
        id: message.id,
        content: confirmationResult,
        role: 'user',
        createdAt: new Date(),
      });
    } else {
      relevant.push(message);
    }

    logWithTiming(startTime, '[chat/route] calling createDataStreamResponse');

    return createDataStreamResponse({
      execute: async (dataStream) => {
        if (dataStream.onError) {
          dataStream.onError((error: any) => {
            console.error(
              '[chat/route] createDataStreamResponse.execute dataStream error:',
              error,
            );
          });
        }

        if (updates.length) {
          updates.forEach((u) => dataStream.writeData(u));
        }

        logWithTiming(startTime, '[chat/route] building tools');

        // Rocky has only 4 AUDD tools — no orchestrator needed.
        // Load all tools but strip askForConfirmation when confirmation was just handled.
        const tools = (degenMode || confirmationHandled)
          ? getToolsFromRequiredTools(
              Object.keys(defaultTools).filter((t) => t !== 'askForConfirmation'),
            )
          : defaultTools;

        const result = streamText({
          model: defaultModel,
          system: systemPrompt,
          tools: tools as Record<string, CoreTool<any, any>>,
          experimental_toolCallStreaming: true,
          experimental_telemetry: {
            isEnabled: true,
            functionId: 'stream-text',
          },
          experimental_repairToolCall: async ({
            toolCall,
            tools,
            parameterSchema,
            error,
          }) => {
            if (NoSuchToolError.isInstance(error)) {
              return null;
            }

            console.log('[chat/route] repairToolCall', toolCall);

            const tool = tools[toolCall.toolName as keyof typeof tools];
            const { object: repairedArgs } = await generateObject({
              model: defaultModel,
              schema: tool.parameters as z.ZodType<any>,
              prompt: [
                `The model tried to call the tool "${toolCall.toolName}"` +
                  ` with the following arguments:`,
                JSON.stringify(toolCall.args),
                `The tool accepts the following schema:`,
                JSON.stringify(parameterSchema(toolCall)),
                'Please fix the arguments.',
              ].join('\n'),
            });
            return { ...toolCall, args: JSON.stringify(repairedArgs) };
          },
          experimental_transform: smoothStream(),
          maxSteps: 15,
          messages: relevant,
          async onFinish({ text, toolCalls, toolResults }) {
            if (!userId) return;
            try {
              logWithTiming(startTime, '[chat/route] streamText.onFinish fired');

              // Combine tool calls + results into the ToolInvocation shape the UI expects.
              const toolInvocations: Record<string, unknown>[] = (toolCalls ?? []).map((tc) => {
                const found = (toolResults ?? []).find(
                  (tr: any) => tr.toolCallId === tc.toolCallId,
                ) as any;
                return {
                  state: found ? 'result' : 'call',
                  toolCallId: (tc as any).toolCallId,
                  toolName: (tc as any).toolName,
                  args: (tc as any).args,
                  ...(found && { result: found.result }),
                };
              });

              const hasContent = text.trim() !== '';
              const hasTools = toolInvocations.length > 0;

              if (!hasContent && !hasTools) {
                console.warn('[chat/route] onFinish: empty response, skipping save');
                return;
              }

              await dbCreateMessages({
                messages: [
                  {
                    conversationId,
                    role: 'assistant',
                    content: text,
                    toolInvocations: hasTools
                      ? (JSON.parse(JSON.stringify(toolInvocations)) as any)
                      : null,
                    experimental_attachments: null,
                  },
                ],
              });

              logWithTiming(startTime, '[chat/route] dbCreateMessages complete');
              revalidatePath('/api/conversations');
            } catch (error) {
              console.error('[chat/route] Failed to save messages:', error);
            }
          },
        });
        result.mergeIntoDataStream(dataStream);
      },
      onError: (_) => {
        return 'An error occurred';
      },
    });
  } catch (error) {
    console.error('[chat/route] Unexpected error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await verifyUser();
  const userId = session?.data?.data?.id;

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { id: conversationId } = await req.json();
    await dbDeleteConversation({ conversationId, userId });
    revalidatePath('/api/conversations');

    return new Response('Conversation deleted', { status: 200 });
  } catch (error) {
    console.error('[chat/route] Delete error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
