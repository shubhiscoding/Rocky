'use server';

import { PublicKey } from '@solana/web3.js';
import { type CoreMessage, type CoreUserMessage, generateText } from 'ai';
import { BaseWallet, SolanaAgentKit, WalletAdapter } from 'solana-agent-kit';
import { z } from 'zod';

import { defaultModel } from '@/ai/providers';
import { RPC_URL } from '@/lib/constants';
import prisma from '@/lib/prisma';
import { ActionEmptyResponse, actionClient } from '@/lib/safe-action';
import { PrivyEmbeddedWallet } from '@/lib/solana/PrivyEmbeddedWallet';
import { decryptPrivateKey } from '@/lib/solana/wallet-generator';
import { SOL_MINT } from '@/types/helius/portfolio';
import { publicKeySchema } from '@/types/util';

import { getPrivyClient, verifyUser } from './user';

export async function generateTitleFromUserMessage({
  message,
}: {
  message: string | unknown;
}) {
  // Extract plain text from string or parts array
  let text: string;
  if (typeof message === 'string') {
    text = message;
  } else if (Array.isArray(message)) {
    text = (message as any[])
      .filter((p) => p?.type === 'text')
      .map((p) => p.text)
      .join(' ');
  } else {
    text = String(message ?? '');
  }

  if (!text.trim()) return 'New Conversation';

  const { text: title } = await generateText({
    model: defaultModel,
    system:
      'Generate a short title (max 60 chars) for a chat conversation based on the first user message. ' +
      'Return only the title text — no quotes, no colons, no explanation.',
    prompt: text,
  });

  return title.slice(0, 80);
}

export async function convertUserResponseToBoolean(message: string) {
  const { text: rawBool } = await generateText({
    model: defaultModel,
    system: `\n
      - you will generate a boolean response based on a user's message content
      - only return true or false
      - if an explicit affirmative response cannot be determined, return false`,
    prompt: message,
  });

  return rawBool === 'true';
}

const renameSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
});

export const renameConversation = actionClient
  .schema(renameSchema)
  .action(
    async ({ parsedInput: { id, title } }): Promise<ActionEmptyResponse> => {
      try {
        await prisma.conversation.update({
          where: { id },
          data: { title },
        });
        return { success: true };
      } catch (error) {
        return { success: false, error: 'UNEXPECTED_ERROR' };
      }
    },
  );

export const retrieveAgentKit = actionClient
  .schema(
    z
      .object({
        walletId: z.string(),
      })
      .optional(),
  )
  .action(async ({ parsedInput }) => {
    const authResult = await verifyUser();

    const userId = authResult?.data?.data?.id;

    if (!userId) {
      return { success: false, error: 'UNAUTHORIZED', data: null };
    }

    const result = await getAgentKit({
      userId,
      walletId: parsedInput?.walletId,
    });

    return result;
  });

export const getAgentKit = async ({
  userId,
  walletId,
}: {
  userId: string;
  walletId?: string;
}) => {
  const whereClause = walletId
    ? { ownerId: userId, id: walletId }
    : { ownerId: userId, active: true };

  const wallet = await prisma.wallet.findFirst({
    where: whereClause,
  });

  if (!wallet) {
    return { success: false, error: 'WALLET_NOT_FOUND' };
  }

  let walletAdapter: WalletAdapter;
  if (wallet.encryptedPrivateKey) {
    walletAdapter = new BaseWallet(
      await decryptPrivateKey(wallet?.encryptedPrivateKey),
    );
  } else {
    const privyClientResponse = await getPrivyClient();
    const privyClient = privyClientResponse?.data;
    if (!privyClient) {
      return { success: false, error: 'PRIVY_CLIENT_NOT_FOUND' };
    }
    walletAdapter = new PrivyEmbeddedWallet(
      privyClient,
      new PublicKey(wallet.publicKey),
    );
  }

  const openaiKey = process.env.OPENAI_API_KEY!;
  const agent = new SolanaAgentKit(walletAdapter, RPC_URL, {
    OPENAI_API_KEY: openaiKey,
    HELIUS_API_KEY: process.env.HELIUS_API_KEY!,
  });

  return { success: true, data: { agent } };
};

export const transferToken = actionClient
  .schema(
    z.object({
      walletId: z.string(),
      receiverAddress: publicKeySchema,
      tokenAddress: publicKeySchema,
      amount: z.number(),
      tokenSymbol: z.string().describe('Symbol of the token to send'),
    }),
  )
  .action(async ({ parsedInput }) => {
    const { walletId, receiverAddress, tokenAddress, amount, tokenSymbol } =
      parsedInput;

    const agentResponse = await retrieveAgentKit({ walletId });

    if (!agentResponse?.data?.success || !agentResponse?.data?.data) {
      return { success: false, error: 'AGENT_NOT_FOUND' };
    }

    const agent = agentResponse.data.data.agent;

    const signature = await agent.transfer(
      new PublicKey(receiverAddress),
      amount,
      tokenAddress !== SOL_MINT ? new PublicKey(tokenAddress) : undefined,
    );

    return { success: true, data: { signature } };
  });
