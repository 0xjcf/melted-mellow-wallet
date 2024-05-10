import { Address, createPublicClient, createWalletClient } from "viem";

export type WalletClient = Awaited<ReturnType<typeof createWalletClient>>;
export type PublicClient = Awaited<ReturnType<typeof createPublicClient>>;

export type SubmitTransactionInput = {
  address: Address;
  toAddress: Address;
  amount: number;
  decimals: number;
  walletClient: WalletClient &
    PublicClient & {
      writeContract: WalletClient["writeContract"];
    };
};

export type GetBalanceInput = {
  address: Address;
  decimals: number;
  walletClient: WalletClient & PublicClient;
};

export type WaitForTxReceiptInput = {
  transactionId: Address;
  walletClient: WalletClient & PublicClient;
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
