-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "WalletSource" AS ENUM ('CUSTOM', 'PRIVY');

-- CreateEnum
CREATE TYPE "Chain" AS ENUM ('SOLANA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "privyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "encryptedPrivateKey" TEXT,
    "walletSource" "WalletSource" NOT NULL DEFAULT 'CUSTOM',
    "chain" "Chain" NOT NULL DEFAULT 'SOLANA',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastReadAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT,
    "toolInvocations" JSONB,
    "experimental_attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_privyId_key" ON "users"("privyId");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_ownerId_publicKey_key" ON "wallets"("ownerId", "publicKey");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
