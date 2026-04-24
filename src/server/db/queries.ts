import { Prisma, Message as PrismaMessage } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';

import prisma from '@/lib/prisma';
import { convertToUIMessages } from '@/lib/utils';

export async function dbGetConversation({
  conversationId,
  includeMessages,
  isServer,
}: {
  conversationId: string;
  includeMessages?: boolean;
  isServer?: boolean;
}) {
  try {
    if (!isServer) {
      return await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastReadAt: new Date() },
        include: includeMessages ? { messages: true } : undefined,
      });
    } else {
      return await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: includeMessages ? { messages: true } : undefined,
      });
    }
  } catch (error) {
    console.error('[DB Error] Failed to get conversation:', { conversationId, error });
    return null;
  }
}

export async function dbCreateConversation({
  conversationId,
  userId,
  title,
}: {
  conversationId: string;
  userId: string;
  title: string;
}) {
  try {
    return await prisma.conversation.create({
      data: { id: conversationId, userId, title },
    });
  } catch (error) {
    console.error('[DB Error] Failed to create conversation:', { conversationId, userId, error });
    return null;
  }
}

export async function dbCreateMessages({
  messages,
}: {
  messages: Omit<PrismaMessage, 'id' | 'createdAt'>[];
}) {
  try {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      await prisma.conversation.update({
        where: { id: lastMessage.conversationId },
        data: { lastMessageAt: new Date() },
      });
    }
    return await prisma.message.createManyAndReturn({
      data: messages as Prisma.MessageCreateManyInput[],
    });
  } catch (error) {
    console.error('[DB Error] Failed to create messages:', { messageCount: messages.length, error });
    return null;
  }
}

export async function dbUpdateMessageToolInvocations({
  messageId,
  toolInvocations,
}: {
  messageId: string;
  toolInvocations: JsonValue;
}) {
  if (!toolInvocations) return null;
  try {
    return await prisma.message.update({
      where: { id: messageId },
      data: { toolInvocations },
    });
  } catch (error) {
    console.error('[DB Error] Failed to update message:', { messageId, error });
    return null;
  }
}

export async function dbGetConversationMessages({
  conversationId,
  limit,
  isServer,
}: {
  conversationId: string;
  limit?: number;
  isServer?: boolean;
}) {
  try {
    if (!isServer) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastReadAt: new Date() },
      });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: limit
        ? { createdAt: 'desc' }
        : [{ createdAt: 'asc' }, { role: 'asc' }],
      take: limit,
    });

    const uiMessages = convertToUIMessages(messages);

    if (
      limit &&
      uiMessages.length &&
      uiMessages[uiMessages.length - 1].role !== 'user'
    ) {
      const lastMessageAt = uiMessages[uiMessages.length - 1].createdAt || new Date(1);
      uiMessages.push({
        id: 'fake',
        createdAt: new Date(lastMessageAt.getTime() - 1),
        role: 'user',
        content: 'user message',
        toolInvocations: [],
        experimental_attachments: [],
      });
    }

    return uiMessages;
  } catch (error) {
    console.error('[DB Error] Failed to get conversation messages:', { conversationId, error });
    return null;
  }
}

export async function dbDeleteConversation({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}) {
  try {
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { conversationId } }),
      prisma.conversation.delete({ where: { id: conversationId, userId } }),
    ]);
  } catch (error) {
    console.error('[DB Error] Failed to delete conversation:', { conversationId, userId, error });
    throw error;
  }
}

export async function dbGetConversations({ userId }: { userId: string }) {
  try {
    return await prisma.conversation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('[DB Error] Failed to get user conversations:', { userId, error });
    return [];
  }
}
