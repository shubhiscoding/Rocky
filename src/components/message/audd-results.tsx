'use client';

import { CheckCircle, Copy, ExternalLink, XCircle } from 'lucide-react';
import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AUDD_MINT } from '@/lib/constants';
import { WalletPortfolio as Portfolio } from '@/types/helius/portfolio';

import { WalletPortfolio } from './wallet-portfolio';
import type {
  AuddBalanceResult,
  AuddSwapResult,
  AuddInvestResult,
} from '@/ai/audd/audd-tools';

function truncateSig(sig: string) {
  if (sig.length <= 12) return sig;
  return `${sig.slice(0, 6)}...${sig.slice(-6)}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-muted-foreground transition-colors hover:text-foreground"
      title="Copy"
    >
      <Copy className={`h-3.5 w-3.5 ${copied ? 'text-green-500' : ''}`} />
    </button>
  );
}

export function AuddBalanceCard({ result }: { result: AuddBalanceResult }) {
  if (!result.success) {
    return (
      <Card className="mt-3 border-destructive/50 bg-destructive/10">
        <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" />
          {result.error}
        </CardContent>
      </Card>
    );
  }

  const { walletAddress, auddBalance, solBalance } = result.data;

  return (
    <Card className="mt-3 overflow-hidden border-border/50">
      <CardHeader className="border-b border-border/40 bg-muted/20 px-4 py-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Wallet Balances
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* AUDD row — highlighted */}
        <div className="relative flex items-center justify-between border-b border-border/40 px-4 py-3">
          <div className="absolute left-0 top-0 h-full w-1 rounded-l bg-teal-500" />
          <div className="flex items-center gap-2 pl-2">
            <span className="text-base">🇦🇺</span>
            <span className="font-semibold text-teal-500">AUDD</span>
          </div>
          <span className="font-mono font-medium">
            {auddBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} AUDD
          </span>
        </div>

        {/* SOL row */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-base">◎</span>
            <span className="font-medium">SOL</span>
          </div>
          <span className="font-mono">
            {solBalance.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 9 })} SOL
          </span>
        </div>

        {/* Wallet address */}
        <div className="flex items-center justify-between border-t border-border/40 bg-muted/10 px-4 py-2">
          <span className="text-xs text-muted-foreground">Wallet</span>
          <div className="flex items-center gap-1.5">
            <a
              href={`https://solscan.io/account/${walletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              {truncateSig(walletAddress)}
            </a>
            <CopyButton text={walletAddress} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AuddSwapResultCard({ result }: { result: AuddSwapResult }) {
  if (!result.success) {
    return (
      <Card className="mt-3 border-destructive/50 bg-destructive/10">
        <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" />
          {result.error}
        </CardContent>
      </Card>
    );
  }

  const { signature, inputSymbol, outputSymbol, amount } = result.data;

  return (
    <Card className="mt-3 border-border/50">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="font-medium text-green-500">Swap Complete</span>
        </div>

        <div className="mb-3 flex items-center justify-center gap-3 rounded-lg bg-muted/30 px-4 py-3 font-mono text-sm">
          <span>
            {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {inputSymbol}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="font-semibold">{outputSymbol}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Transaction</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono">{truncateSig(signature)}</span>
            <CopyButton text={signature} />
            <a
              href={`https://solscan.io/tx/${signature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AuddInvestResultCard({ result }: { result: AuddInvestResult }) {
  if (!result.success) {
    return (
      <Card className="mt-3 border-destructive/50 bg-destructive/10">
        <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" />
          {result.error}
        </CardContent>
      </Card>
    );
  }

  const { signature, amount, protocol } = result.data;

  return (
    <Card className="mt-3 border-border/50">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="font-medium text-green-500">Invested via {protocol}</span>
        </div>

        <div className="mb-3 rounded-lg bg-muted/30 px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount deposited</span>
            <span className="font-mono font-medium">
              {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} AUDD
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Your AUDD is now earning yield.{' '}
            <a
              href="https://lulo.fi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Track on Lulo.fi →
            </a>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Transaction</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono">{truncateSig(signature)}</span>
            <CopyButton text={signature} />
            <a
              href={`https://solscan.io/tx/${signature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AuddPortfolioView({ data }: { data: Portfolio }) {
  return (
    <div className="relative">
      {/* Teal left-border highlight on first row (AUDD) */}
      <div
        className="pointer-events-none absolute left-0 top-[calc(theme(spacing.14)+1px)] z-10 h-[52px] w-1 rounded-l bg-teal-500"
        aria-hidden
      />
      <WalletPortfolio data={data} />
    </div>
  );
}
