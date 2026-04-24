import type { Message, Wallet as _PrismaWallet } from '@prisma/client';
import { User as _PrismaUser } from '@prisma/client';
import type { Conversation as _PrismaConversation } from '@prisma/client';
import { User as _PrivyUser } from '@privy-io/react-auth';

export type EmbeddedWallet = Pick<
  _PrismaWallet,
  'id' | 'ownerId' | 'name' | 'publicKey' | 'walletSource' | 'active' | 'chain'
>;

export type ConversationMeta = Pick<_PrismaConversation, 'id' | 'userId' | 'title'>;

export type Conversation = _PrismaConversation & {
  messages: Message[];
};

export type PrivyUser = _PrivyUser;

export type PrismaUser = _PrismaUser & {
  wallets: EmbeddedWallet[];
};

export type NeurUser = PrismaUser & {
  privyUser: PrivyUser;
};
