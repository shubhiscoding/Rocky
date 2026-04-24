export interface Suggestion {
  id: string;
  title: string;
  subtitle: string;
}

export const SUGGESTIONS: Suggestion[] = [
  {
    id: 'check-audd-balance',
    title: 'Check my AUDD balance',
    subtitle: 'see how much AUDD is in my wallet',
  },
  {
    id: 'invest-audd',
    title: 'Invest 50 AUDD safely',
    subtitle: 'deposit into Lulo for yield',
  },
  {
    id: 'swap-audd-sol',
    title: 'Swap 100 AUDD to SOL',
    subtitle: 'using Jupiter for best rate',
  },
  {
    id: 'view-portfolio',
    title: 'View my portfolio',
    subtitle: 'see all balances with AUDD highlighted',
  },
  {
    id: 'swap-audd-usdc',
    title: 'Convert AUDD to USDC',
    subtitle: 'swap Australian to US dollar stablecoin',
  },
  {
    id: 'invest-all',
    title: 'Invest all my AUDD',
    subtitle: 'put my full AUDD balance to work',
  },
];

export function getRandomSuggestions(count: number): Suggestion[] {
  const safeCount = Math.min(count, SUGGESTIONS.length);
  const startIndex = Math.floor(Date.now() / 1000) % SUGGESTIONS.length;

  const rotatedSuggestions = [
    ...SUGGESTIONS.slice(startIndex),
    ...SUGGESTIONS.slice(0, startIndex),
  ];

  return rotatedSuggestions.slice(0, safeCount);
}
