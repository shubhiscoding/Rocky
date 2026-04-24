'use client';

import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';

import { retrieveAgentKit } from '@/server/actions/ai';
import { searchWalletAssets } from '@/lib/solana/helius';
import { AUDD_MINT, USDC_MINT, SOL_MINT } from '@/lib/constants';
import { WalletPortfolio, transformToPortfolio } from '@/types/helius/portfolio';

import { AuddBalanceCard } from '@/components/message/audd-results';
import { AuddSwapResultCard } from '@/components/message/audd-results';
import { AuddInvestResultCard } from '@/components/message/audd-results';
import { AuddPortfolioView } from '@/components/message/audd-results';

export type AuddBalanceResult =
  | { success: true; data: { walletAddress: string; auddBalance: number; solBalance: number } }
  | { success: false; error: string };

export type AuddSwapResult =
  | { success: true; data: { signature: string; inputSymbol: string; outputSymbol: string; amount: number } }
  | { success: false; error: string };

export type AuddInvestResult =
  | { success: true; data: { signature: string; amount: number; protocol: string } }
  | { success: false; error: string };

export const auddTools = {
  checkAuddBalance: {
    displayName: '💰 AUDD Balance',
    description: 'Check AUDD and SOL balances for the connected wallet',
    isCollapsible: true,
    isExpandedByDefault: true,
    parameters: z.object({}),
    execute: async function (this: { agentKit?: any }) {
      try {
        const agentResult = await retrieveAgentKit(undefined);
        const agent = agentResult?.data?.data?.agent;
        if (!agent) throw new Error('Failed to retrieve agent kit');

        const pubkey = agent.wallet_address.toBase58();

        let auddBalance = 0;
        try {
          // getBalanceOther(walletAddress, tokenMint?) uses getTokenAccountsByOwner internally
          auddBalance = await agent.getBalanceOther(
            agent.wallet_address,
            new PublicKey(AUDD_MINT),
          );
        } catch {
          // Token account may not exist — balance is 0
        }

        // getBalance() with no args returns SOL balance for agent's wallet
        const solBalance = await agent.getBalance();

        return {
          success: true,
          data: {
            walletAddress: pubkey,
            auddBalance,
            solBalance,
          },
        } as AuddBalanceResult;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch balance',
        } as AuddBalanceResult;
      }
    },
    render: (raw: unknown) => {
      return <AuddBalanceCard result={raw as AuddBalanceResult} />;
    },
  },

  swapAudd: {
    agentKit: null,
    displayName: '🔄 Swap AUDD',
    description:
      'Swap AUDD to USDC or SOL via Jupiter Exchange. requiresConfirmation: true',
    requiresConfirmation: true,
    parameters: z.object({
      requiresConfirmation: z.boolean().optional().default(true),
      outputToken: z
        .enum(['USDC', 'SOL'])
        .describe('Target token to receive in exchange for AUDD'),
      amount: z.number().positive().describe('Amount of AUDD to swap'),
      slippageBps: z
        .number()
        .min(0)
        .max(10000)
        .optional()
        .default(300)
        .describe('Slippage tolerance in basis points (default 300 = 3%)'),
    }),
    execute: async function (
      this: { agentKit?: any },
      {
        outputToken,
        amount,
        slippageBps = 300,
      }: { requiresConfirmation?: boolean; outputToken: 'USDC' | 'SOL'; amount: number; slippageBps?: number },
    ) {
      try {
        const agentResult = await retrieveAgentKit(undefined);
        const agent = agentResult?.data?.data?.agent;
        if (!agent) throw new Error('Failed to retrieve agent kit');

        const outputMint = outputToken === 'USDC' ? USDC_MINT : SOL_MINT;

        const signature = await agent.trade(
          new PublicKey(outputMint),
          amount,
          new PublicKey(AUDD_MINT),
          slippageBps,
        );

        return {
          success: true,
          data: {
            signature,
            inputSymbol: 'AUDD',
            outputSymbol: outputToken,
            amount,
          },
        } as AuddSwapResult;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Swap failed',
        } as AuddSwapResult;
      }
    },
    render: (raw: unknown) => {
      return <AuddSwapResultCard result={raw as AuddSwapResult} />;
    },
  },

  investAudd: {
    agentKit: null,
    displayName: '📈 Invest AUDD',
    description:
      'Deposit AUDD into the Lulo yield protocol to earn interest. requiresConfirmation: true',
    requiresConfirmation: true,
    parameters: z.object({
      requiresConfirmation: z.boolean().optional().default(true),
      amount: z
        .number()
        .positive()
        .describe('Amount of AUDD to deposit for yield'),
    }),
    execute: async function (
      this: { agentKit?: any },
      { amount }: { requiresConfirmation?: boolean; amount: number },
    ) {
      try {
        const agentResult = await retrieveAgentKit(undefined);
        const agent = agentResult?.data?.data?.agent;
        if (!agent) throw new Error('Failed to retrieve agent kit');

        let signature: string;

        const agentAny = agent as any;
        if (typeof agentAny.luloDepositAsset === 'function') {
          signature = await agentAny.luloDepositAsset({
            depositTokenMint: AUDD_MINT,
            depositAmount: amount,
          });
        } else {
          // Fallback: swap AUDD→USDC first, then deposit USDC into Lulo
          const swapSig = await agent.trade(
            new PublicKey(USDC_MINT),
            amount,
            new PublicKey(AUDD_MINT),
            300,
          );
          signature = typeof swapSig === 'string' ? swapSig : String(swapSig);
          if (typeof agentAny.luloDepositAsset === 'function') {
            const depositSig = await agentAny.luloDepositAsset({
              depositTokenMint: USDC_MINT,
              depositAmount: amount,
            });
            signature = typeof depositSig === 'string' ? depositSig : signature;
          }
        }

        return {
          success: true,
          data: {
            signature,
            amount,
            protocol: 'Lulo',
          },
        } as AuddInvestResult;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Deposit failed',
        } as AuddInvestResult;
      }
    },
    render: (raw: unknown) => {
      return <AuddInvestResultCard result={raw as AuddInvestResult} />;
    },
  },

  getPortfolio: {
    displayName: '🏦 Portfolio',
    description: 'Get full wallet portfolio with AUDD balance highlighted at the top',
    isCollapsible: false,
    parameters: z.object({}),
    execute: async function (this: { agentKit?: any }) {
      try {
        const agentResult = await retrieveAgentKit(undefined);
        const agent = agentResult?.data?.data?.agent;
        if (!agent) throw new Error('Failed to retrieve agent kit');

        const pubkey = agent.wallet_address.toBase58();
        const { fungibleTokens } = await searchWalletAssets(pubkey);
        const portfolio = transformToPortfolio(pubkey, fungibleTokens, []);

        // Sort: AUDD first, SOL second, then by value descending
        const auddToken = portfolio.tokens.find((t) => t.mint === AUDD_MINT);
        const solToken = portfolio.tokens.find((t) => t.symbol === 'SOL');
        const rest = portfolio.tokens
          .filter((t) => t.mint !== AUDD_MINT && t.symbol !== 'SOL')
          .sort((a, b) => b.balance * b.pricePerToken - a.balance * a.pricePerToken)
          .slice(0, 8);

        portfolio.tokens = [
          ...(auddToken ? [auddToken] : []),
          ...(solToken ? [solToken] : []),
          ...rest,
        ];

        return { suppressFollowUp: true, data: portfolio };
      } catch (error) {
        throw new Error(
          `Failed to get portfolio: ${error instanceof Error ? error.message : 'Unknown'}`,
        );
      }
    },
    render: (raw: unknown) => {
      const result = (raw as { data?: WalletPortfolio }).data;
      if (!result) return null;
      return <AuddPortfolioView data={result} />;
    },
  },

  askForConfirmation: {
    displayName: '⚠️ Confirmation',
    description: 'Confirm the execution of a function on behalf of the user.',
    parameters: z.object({
      message: z.string().describe('The message to ask for confirmation'),
    }),
  },
};
