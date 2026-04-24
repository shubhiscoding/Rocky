'use server';

import { z } from 'zod';

import prisma from '@/lib/prisma';
import { ActionResponse, actionClient } from '@/lib/safe-action';
import { dbCreateConversation } from '@/server/db/queries';

import { verifyUser } from './user';

export const markConversationAsRead = actionClient
  .schema(z.object({ id: z.string() }))
  .action<ActionResponse<null>>(async ({ parsedInput: { id } }) => {
    const authResult = await verifyUser();
    const userId = authResult?.data?.data?.id;

    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Update conversation last read timestamp
    await prisma.conversation.update({
      where: { id },
      data: { lastReadAt: new Date() },
    });

    return { success: true };
  });

export const createConversationStub = actionClient
  .schema(z.object({ conversationId: z.string() }))
  .action<ActionResponse<null>>(async ({ parsedInput: { conversationId } }) => {
    const authResult = await verifyUser();
    const userId = authResult?.data?.data?.id;

    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbCreateConversation({
      conversationId,
      userId,
      title: 'New Conversation',
    });

    return { success: true };
  });
