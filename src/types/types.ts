import { Address, WalletClient, PublicClient } from "viem";



export type SubmitTransactionInput = {
  address: Address;
  toAddress: Address;
  amount: number;
  decimals: number;
  walletClient: WalletClient
};

export type GetBalanceInput = {
  address: Address;
  decimals: number;
  walletClient: PublicClient;
};

export type WaitForTxReceiptInput = {
  transactionId: Address;
  walletClient: PublicClient;
};

export type SendToMachineContext = {
  amount: number;
  address: Address;
  toAddress: Address;
  amountError: string;
  addressError: string;
  walletError: string;
  transactionId?: string;
  balance: number;
  decimals: number;
  walletClient: WalletClient & PublicClient;
};

export type SendToMachineEvents =
  | { type: "input.toAddress"; toAddress: Address }
  | { type: "input.amount"; amount: number }
  | { type: "submit" };
