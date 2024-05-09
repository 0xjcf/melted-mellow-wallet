import { Address } from "viem";

export type SubmitTransactionInput = {
  address: Address;
  toAddress: Address;
  amount: number;
  decimals: number;
};

export type GetBalanceInput = { address: Address; decimals: number };

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
};

export type SendToMachineEvents =
  | { type: "input.toAddress"; toAddress: Address }
  | { type: "input.amount"; amount: number }
  | { type: "submit" };
