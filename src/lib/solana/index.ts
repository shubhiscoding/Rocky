import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

import { RPC_URL } from '../constants';

export const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

export const createConnection = () => new Connection(RPC_URL);

export interface TransferWithMemoParams {
  to: string;
  amount: number;
  memo: string;
}

export class SolanaUtils {
  private static connection = new Connection(RPC_URL);

  static async getBalance(address: string): Promise<number> {
    try {
      const balance = await this.connection.getBalance(new PublicKey(address));
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      return 0;
    }
  }
}
