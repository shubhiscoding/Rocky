'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useLogin } from '@privy-io/react-auth';
import { ArrowRight, TrendingUp, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const features = [
  {
    icon: '💰',
    title: 'Check AUDD Balance',
    description: 'See your AUD stablecoin balance instantly.',
  },
  {
    icon: '🔄',
    title: 'Swap AUDD',
    description: 'Convert AUDD to SOL or USDC via Jupiter.',
  },
  {
    icon: '📈',
    title: 'Earn Yield',
    description: 'Deposit AUDD into Lulo for automated yield.',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { login } = useLogin({
    onComplete: () => router.push('/home'),
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/40 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-sm font-bold text-white">
            R
          </div>
          <span className="text-lg font-semibold text-teal-500">Rocky</span>
        </div>
        <Button
          onClick={login}
          className="bg-teal-500 text-white hover:bg-teal-600"
        >
          Launch App
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-sm text-teal-500">
            <Zap className="h-3.5 w-3.5" />
            AUDD-native financial agent on Solana
          </div>

          <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
            Your AUDD{' '}
            <span className="text-teal-500">works for you.</span>
          </h1>

          <p className="text-xl text-muted-foreground">
            Rocky is an AI agent that manages AUDD — the Australian Dollar
            stablecoin on Solana. Invest, swap, and track in plain English.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={login}
              className="bg-teal-500 text-white hover:bg-teal-600"
            >
              Start with Rocky
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Example prompt */}
          <div className="mx-auto mt-4 max-w-md rounded-xl border border-border/50 bg-muted/30 p-4 text-left font-mono text-sm">
            <span className="text-muted-foreground">You: </span>
            <span>Invest 100 AUDD safely</span>
            <br />
            <span className="text-teal-500">Rocky: </span>
            <span className="text-muted-foreground">
              This is happy! Want want want to invest! Confirm deposit into Lulo,
              question?
            </span>
          </div>
        </div>

        {/* Features */}
        <div className="mx-auto mt-20 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <Card
              key={f.title}
              className="flex flex-col items-center gap-3 p-6 text-center"
            >
              <span className="text-3xl">{f.icon}</span>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </Card>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 px-6 py-4 text-center text-xs text-muted-foreground">
        Rocky — Powered by AUDD, Solana, and Claude
      </footer>
    </div>
  );
}
