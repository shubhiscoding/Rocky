import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import AuthProviders from '@/components/provider-auth';
import { ThemeProvider } from '@/components/provider-theme';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    template: '%s | Rocky',
    default: 'Rocky — AUDD Agent on Solana',
  },
  description:
    'Autonomous AUDD financial agent on Solana. Invest, swap, and manage AUD stablecoin with natural language.',
  icons: {
    icon: '/icons/solscan.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          `${geistSans.variable} ${geistMono.variable}`,
          'overflow-x-hidden antialiased',
        )}
      >
        <AuthProviders>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <main className="sticky bottom-0 overflow-hidden md:overflow-visible">
              {children}
              <Toaster />
            </main>
          </ThemeProvider>
        </AuthProviders>
      </body>
    </html>
  );
}
