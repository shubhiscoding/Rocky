import config from '../../package.json';

export const APP_VERSION = config.version;
export const IS_BETA = true;

export const RPC_URL =
  process.env.NEXT_PUBLIC_HELIUS_RPC_URL ||
  'https://api.mainnet-beta.solana.com';

export const MAX_TOKEN_MESSAGES = 10;

export const NO_CONFIRMATION_MESSAGE = ' (Does not require confirmation)';

// AUDD (Australian Dollar Digital) on Solana mainnet
// Verify: https://solscan.io/token/GHoSSvnLaEaQHBJWBV3f3tMVDEZNk6rETCWpPbRoAv2W
export const AUDD_MINT =
  process.env.NEXT_PUBLIC_AUDD_MINT ||
  'GHoSSvnLaEaQHBJWBV3f3tMVDEZNk6rETCWpPbRoAv2W';

export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const SOL_MINT = 'So11111111111111111111111111111111111111112';
