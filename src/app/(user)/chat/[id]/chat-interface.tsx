'use client';

import {
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import Image from 'next/image';

import { Attachment, JSONValue, Message } from 'ai';
import { useChat } from 'ai/react';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import { getToolConfig } from '@/ai/providers';
import { Confirmation } from '@/components/confimation';
import { FloatingWallet } from '@/components/floating-wallet';
import Logo from '@/components/logo';
import { ToolResult } from '@/components/message/tool-result';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import usePolling from '@/hooks/use-polling';
import { useUser } from '@/hooks/use-user';
import { useWalletPortfolio } from '@/hooks/use-wallet-portfolio';
import { EVENTS } from '@/lib/events';
import { cn } from '@/lib/utils';
import { type ToolActionResult, ToolUpdate } from '@/types/util';

import { ConversationInput } from '../../home/conversation-input';

interface ToolResult {
  toolCallId: string;
  result: any;
}

interface ChatMessageProps {
  message: Message;
  index: number;
  messages: Message[];
  addToolResult: (result: ToolResult) => void;
}

interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  displayName?: string;
  result?: {
    result?: string;
    message: string;
  };
  state?: string;
  args?: any;
}

const MAX_JSON_LINES = 20;

const truncateJson = (json: unknown): string => {
  const formatted = JSON.stringify(json, null, 2);
  const lines = formatted.split('\n');
  if (lines.length <= MAX_JSON_LINES) return formatted;
  const firstHalf = lines.slice(0, MAX_JSON_LINES / 2);
  const lastHalf = lines.slice(-MAX_JSON_LINES / 2);
  return [...firstHalf, '    ...', ...lastHalf].join('\n');
};

const applyToolUpdates = (messages: Message[], toolUpdates: ToolUpdate[]) => {
  while (toolUpdates.length > 0) {
    const update = toolUpdates.pop();
    if (!update) continue;

    if (update.type === 'tool-update') {
      messages.forEach((msg) => {
        const toolInvocation = msg.toolInvocations?.find(
          (tool) => tool.toolCallId === update.toolCallId,
        ) as ToolInvocation | undefined;

        if (toolInvocation) {
          if (!toolInvocation.result) {
            toolInvocation.result = {
              result: update.result,
              message: toolInvocation.args?.message,
            };
          } else {
            toolInvocation.result.result = update.result;
          }
        }
      });
    }
  }
  return messages;
};

const useAnimationEffect = () => {
  useEffect(() => {
    document.body.classList.remove('animate-fade-out');
    document.body.classList.add('animate-fade-in');
    const timer = setTimeout(() => {
      document.body.classList.remove('animate-fade-in');
    }, 300);
    return () => clearTimeout(timer);
  }, []);
};

function MessageToolInvocations({
  toolInvocations,
  addToolResult,
}: {
  toolInvocations: ToolInvocation[];
  addToolResult: (result: ToolResult) => void;
}) {
  return (
    <div className="space-y-px">
      {toolInvocations.map(
        ({ toolCallId, toolName, displayName, result, state, args }) => {
          const toolResult = result as ToolActionResult;
          if (toolName === 'askForConfirmation') {
            return (
              <div key={toolCallId} className="group">
                <Confirmation
                  message={args?.message}
                  result={toolResult?.result}
                  toolCallId={toolCallId}
                  addResultUtility={(result) =>
                    addToolResult({
                      toolCallId,
                      result: { result, message: args?.message },
                    })
                  }
                />
              </div>
            );
          }

          const isCompleted = result !== undefined;
          const isError =
            isCompleted &&
            typeof result === 'object' &&
            result !== null &&
            'error' in result;

          const config = getToolConfig(toolName);

          if (!config) {
            const header = (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-destructive ring-2 ring-destructive/20" />
                <span className="truncate text-xs font-medium text-foreground/90">
                  Tool Error
                </span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">
                  {toolCallId.slice(0, 9)}
                </span>
              </div>
            );

            return (
              <div key={toolCallId} className="group">
                <ToolResult
                  toolName="Tool Error"
                  result={{
                    result: 'Tool Error',
                    error:
                      'An error occurred while processing your request, please try again or adjust your phrasing.',
                  }}
                  header={header}
                />
              </div>
            );
          }

          const finalDisplayName = displayName || config?.displayName;

          const header = (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div
                className={cn(
                  'h-1.5 w-1.5 rounded-full ring-2',
                  isCompleted
                    ? isError
                      ? 'bg-destructive ring-destructive/20'
                      : 'bg-emerald-500 ring-emerald-500/20'
                    : 'animate-pulse bg-amber-500 ring-amber-500/20',
                )}
              />
              <span className="truncate text-xs font-medium text-foreground/90">
                {finalDisplayName}
              </span>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">
                {toolCallId.slice(0, 9)}
              </span>
            </div>
          );

          return (
            <div key={toolCallId} className="group">
              {isCompleted ? (
                <ToolResult
                  toolName={toolName}
                  result={result}
                  header={header}
                />
              ) : (
                <>
                  {header}
                  <div className="mt-px px-3">
                    <div className="h-20 animate-pulse rounded-lg bg-muted/40" />
                  </div>
                </>
              )}
            </div>
          );
        },
      )}
    </div>
  );
}

function ChatMessage({ message, index, messages, addToolResult }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const showAvatar =
    !isUser && (index === 0 || messages[index - 1].role === 'user');
  const isConsecutive = index > 0 && messages[index - 1].role === message.role;

  const processedContent = message.content?.replace(
    /!\[(.*?)\]\((.*?)\s+=(\d+)x(\d+)\)/g,
    (_, alt, src, width, height) => `![${alt}](${src}#size=${width}x${height})`,
  );

  return (
    <div
      className={cn(
        'flex w-full items-start gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
        isConsecutive ? 'mt-2' : 'mt-6',
        index === 0 && 'mt-0',
      )}
    >
      {showAvatar ? (
        <Avatar className="mt-0.5 h-8 w-8 shrink-0 select-none">
          <Logo />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
      ) : !isUser ? (
        <div className="w-8" aria-hidden="true" />
      ) : null}

      <div className="group relative flex max-w-[85%] flex-row items-center">
        <div
          className={cn('relative gap-2', isUser ? 'items-end' : 'items-start')}
        >
          {message.content && (
            <div
              className={cn(
                'relative flex flex-col gap-2 rounded-2xl px-4 py-3 text-sm shadow-sm',
                isUser ? 'bg-primary' : 'bg-muted/60',
              )}
            >
              <div
                className={cn(
                  'prose prose-sm max-w-prose break-words leading-tight md:prose-base',
                  isUser
                    ? 'prose-invert dark:prose-neutral'
                    : 'prose-neutral dark:prose-invert',
                )}
              >
                <ReactMarkdown
                  rehypePlugins={[rehypeRaw]}
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ node, ...props }) => (
                      <a {...props} target="_blank" rel="noopener noreferrer" />
                    ),
                    img: ({ node, alt, src, ...props }) => {
                      if (!src || typeof src !== 'string') return null;
                      try {
                        const url = new URL(src, 'http://dummy.com');
                        const size = url.hash.match(/size=(\d+)x(\d+)/);
                        if (size) {
                          const [, width, height] = size;
                          url.hash = '';
                          return (
                            <Image
                              src={url.pathname + url.search}
                              alt={alt || ''}
                              width={Number(width)}
                              height={Number(height)}
                              className="inline-block align-middle"
                            />
                          );
                        }
                      } catch {
                        // ignore URL parse errors
                      }
                      return (
                        <Image
                          src={src as string}
                          alt={alt || ''}
                          width={500}
                          height={300}
                          className="inline-block align-middle"
                        />
                      );
                    },
                  }}
                >
                  {processedContent}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {message.toolInvocations && (
            <MessageToolInvocations
              toolInvocations={message.toolInvocations as ToolInvocation[]}
              addToolResult={addToolResult}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="flex w-full items-start gap-3">
      <Avatar className="mt-0.5 h-8 w-8 shrink-0 select-none">
        <Logo />
        <AvatarFallback>AI</AvatarFallback>
      </Avatar>

      <div className="relative flex max-w-[85%] flex-col items-start gap-2">
        <div className="relative flex flex-col gap-2 rounded-2xl bg-muted/60 px-4 py-3 text-sm shadow-sm">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatInterface({
  id,
  initialMessages = [],
}: {
  id: string;
  initialMessages?: Message[];
}) {
  const {
    messages: chatMessages,
    input,
    handleSubmit,
    isLoading,
    addToolResult,
    data,
    setInput,
    setMessages,
  } = useChat({
    id,
    maxSteps: 10,
    initialMessages,
    sendExtraMessageFields: true,
    body: { id },
    onFinish: () => {
      if (window.location.pathname === `/chat/${id}`) {
        window.history.replaceState({}, '', `/chat/${id}`);
      }
      refresh();
      window.dispatchEvent(new CustomEvent(EVENTS.CONVERSATION_READ));
    },
    experimental_prepareRequestBody: ({ messages }) => {
      return {
        message: messages[messages.length - 1],
        id,
      } as unknown as JSONValue;
    },
  });

  const messages = useMemo(() => {
    const toolUpdates = data as unknown as ToolUpdate[];
    if (!toolUpdates || toolUpdates.length === 0) return chatMessages;
    return applyToolUpdates(chatMessages, toolUpdates);
  }, [chatMessages, data]);

  usePolling({
    url: `/api/chat/${id}`,
    onUpdate: (data: Message[]) => {
      if (!data) return;
      if (data && data.length) setMessages(data);
      window.dispatchEvent(new CustomEvent(EVENTS.CONVERSATION_READ));
    },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    data: portfolio,
    isLoading: isPortfolioLoading,
    refresh,
  } = useWalletPortfolio();

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, []);

  const handleSend = async (value: string, attachments: Attachment[]) => {
    if (!value.trim()) return;

    const fakeEvent = {
      preventDefault: () => {},
      type: 'submit',
    } as React.FormEvent;

    await handleSubmit(fakeEvent, {
      data: value,
      experimental_attachments: attachments,
    });
    scrollToBottom();
  };

  useAnimationEffect();

  return (
    <div className="flex h-full flex-col">
      <div className="no-scrollbar relative flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl">
          <div className="space-y-4 px-4 pb-36 pt-4">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                index={index}
                messages={messages}
                addToolResult={addToolResult}
              />
            ))}
            {isLoading &&
              messages[messages.length - 1]?.role !== 'assistant' && (
                <LoadingMessage />
              )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/95 to-background/0" />
        <div className="relative mx-auto w-full max-w-3xl px-4 py-4">
          {portfolio && (
            <FloatingWallet data={portfolio} isLoading={isPortfolioLoading} />
          )}

          <ConversationInput
            value={input}
            onChange={setInput}
            onSubmit={handleSend}
            onChat={true}
          />
        </div>
      </div>
    </div>
  );
}
