import { assign, fromPromise, setup } from "xstate";
import { z } from "zod";
import {
  createWalletClient,
  custom,
  getContract,
  publicActions,
  parseUnits,
  Address,
  EIP1193Provider,
} from "viem";

import { avalancheFuji } from "viem/chains";
import abi from "../abi/abi.json";

import type {
  SendToMachineContext,
  SendToMachineEvents,
  GetBalanceInput,
  SubmitTransactionInput,
  WalletClient,
  PublicClient,
  WaitForTxReceiptInput,
} from "../types/types";

const usdcContractAddress = "0x5425890298aed601595a70AB815c96711a31Bc65";

const machine = setup({
  types: {
    context: {} as SendToMachineContext,
    events: {} as SendToMachineEvents,

    input: {} as {
      address: Address;
      toAddress: Address;
      walletClient: WalletClient;
    },
  },

  actors: {
    createWalletClient: fromPromise(async () => {
      const noopProvider = {
        request: () => null,
      } as unknown as EIP1193Provider;

      const provider =
        typeof window !== "undefined" ? window.ethereum! : noopProvider;

      const walletClient = createWalletClient({
        chain: avalancheFuji,

        transport: custom(provider),
      }).extend(publicActions);

      return walletClient;
    }),

    getAddress: fromPromise(
      async ({
        input,
      }: {
        input: { walletClient: WalletClient & PublicClient };
      }) => {
        const [address] = await input.walletClient.getAddresses();
        console.log(address);
        return address;
      }
    ),

    getDecimals: fromPromise(
      async ({ input }: { input: { walletClient: WalletClient } }) => {
        const contract = getContract({
          address: usdcContractAddress,
          abi,
          client: input.walletClient,
        });

        const decimals = await contract.read.decimals();

        return decimals as number;
      }
    ),

    getBalance: fromPromise(async ({ input }: { input: GetBalanceInput }) => {
      const rawBalance = (await input.walletClient.readContract({
        address: usdcContractAddress,
        abi,
        functionName: "balanceOf",
        args: [input.address],
      })) as bigint;

      const factor = BigInt(10) ** BigInt(input.decimals);
      const balance = Number(rawBalance) / Number(factor);

      return balance;
    }),

    submitTransaction: fromPromise(
      async ({ input }: { input: SubmitTransactionInput }) => {
        const amount = parseUnits(input.amount.toString(), input.decimals);

        try {
          const hash = await input.walletClient.writeContract({
            address: usdcContractAddress,
            abi,
            functionName: "transfer",
            args: [input.toAddress, amount],
            account: input.address,
            chain: avalancheFuji,
          });

          return hash;
        } catch (error) {
          if (error instanceof Error) {
            throw new Error("Could not send transaction");
          }
        }
      }
    ),

    waitForTxReceipt: fromPromise(
      async ({ input }: { input: WaitForTxReceiptInput }) => {
        const transaction = await input.walletClient.waitForTransactionReceipt({
          hash: input.transactionId,
        });

        return transaction;
      }
    ),
  },

  guards: {
    is0xAddress: function (_, { toAddress }: { toAddress?: string }) {
      const validate0xAddress = z.string().startsWith("0x");
      return validate0xAddress.safeParse(toAddress).success;
    },

    is42CharAddress: function (_, { toAddress }: { toAddress?: string }) {
      const validate42CharAddress = z.string().length(42);
      return validate42CharAddress.safeParse(toAddress).success;
    },

    minimumFunds: function (_, { amount }: { amount: number }) {
      return amount > 0;
    },
  },
}).createMachine({
  context: {
    amount: 0,
    address: "" as Address,
    toAddress: "" as Address,
    amountError: "",
    addressError: "",
    walletError: "",
    transactionId: "",
    balance: 0,
    decimals: 0,
    walletClient: {} as WalletClient & PublicClient,
  },

  id: "transactionForm",

  initial: "wallet",

  states: {
    wallet: {
      initial: "createWalletClient",

      states: {
        createWalletClient: {
          invoke: {
            src: "createWalletClient",
            onDone: {
              target: "getAddress",
              actions: assign({
                walletClient: ({ event }) => event.output,
              }),
            },
            onError: {
              target: "error.createWalletClient",
              actions: assign({
                walletError: "Could not connect to wallet",
              }),
            },
          },
        },

        getAddress: {
          invoke: {
            src: "getAddress",
            input: ({ context }) => ({ walletClient: context.walletClient }),
            onDone: {
              target: "getDecimals",
              actions: assign({
                address: ({ event }) => event.output,
              }),
            },
            onError: {
              target: "error.getAddress",
              actions: assign({
                walletError: "Could not fetch address",
              }),
            },
          },
        },

        getDecimals: {
          invoke: {
            src: "getDecimals",
            input: ({ context }) => ({ walletClient: context.walletClient }),
            onDone: {
              target: "getBalance",
              actions: assign({
                decimals: ({ event }) => event.output,
              }),
            },
          },
        },

        getBalance: {
          invoke: {
            src: "getBalance",
            input: ({ context }) => ({
              address: context.address,
              decimals: context.decimals,
              walletClient: context.walletClient,
            }),
            onDone: {
              target: "success",
              actions: assign({
                balance: ({ event }) => event.output,
              }),
            },
            onError: {
              target: "error.getBalance",
              actions: assign({
                walletError: "Could not fetch balance",
              }),
            },
          },
        },

        success: {
          type: "final",
        },

        error: {
          initial: "getAddress",
          states: {
            getAddress: {},
            getBalance: {},
            createWalletClient: {},
          },
        },
      },

      onDone: {
        target: "input",
      },
    },

    input: {
      type: "parallel",
      states: {
        address: {
          on: {
            "input.toAddress": {
              actions: assign({
                toAddress: ({ event }) => event.toAddress,
              }),
            },
          },
        },
        amount: {
          on: {
            "input.amount": {
              actions: assign({
                amount: ({ event }) => event.amount,
              }),
            },
          },
        },
      },
      on: {
        submit: {
          target: "validate",
        },
      },
    },

    validate: {
      type: "parallel",
      states: {
        address: {
          initial: "is0xAddress",
          states: {
            is0xAddress: {
              always: [
                {
                  target: "is42CharAddress",
                  guard: {
                    type: "is0xAddress",
                    params: ({ context }) => ({
                      toAddress: context.toAddress,
                    }),
                  },
                },
                {
                  target: "error",
                  actions: assign({
                    addressError: "Provide a 0x address",
                  }),
                },
              ],
            },
            is42CharAddress: {
              always: [
                {
                  target: "success",
                  guard: {
                    type: "is42CharAddress",
                    params: ({ context }) => ({
                      toAddress: context.toAddress,
                    }),
                  },
                },
                {
                  target: "error",
                  actions: assign({
                    addressError: "Provide a 42 character long address",
                  }),
                },
              ],
            },
            success: {
              type: "final",
              entry: assign({
                addressError: "",
              }),
            },
            error: {},
          },
          on: {
            "input.toAddress": {
              actions: assign({
                toAddress: ({ event }) => event.toAddress,
              }),
            },
          },
        },
        amount: {
          initial: "check",
          states: {
            check: {
              always: [
                {
                  target: "success",
                  guard: {
                    type: "minimumFunds",
                    params: ({ context }) => ({ amount: context.amount }),
                  },
                },
                {
                  target: "error",
                  actions: assign({
                    amountError: "Provide a valid amount",
                  }),
                },
              ],
            },
            success: {
              type: "final",
            },
            error: {},
          },
          on: {
            "input.amount": {
              actions: assign({
                amount: ({ event }) => event.amount,
              }),
            },
          },
        },
      },
      on: {
        submit: {
          target: ".",
        },
      },
      onDone: {
        target: "submit",
        actions: assign({
          addressError: "",
          amountError: "",
        }),
      },
    },

    submit: {
      invoke: {
        src: "submitTransaction",
        input: ({ context }) => ({
          address: context.address,
          toAddress: context.toAddress,
          amount: context.amount,
          decimals: context.decimals,
          walletClient: context.walletClient,
        }),
        onDone: {
          target: "waitForTxReceipt",
          actions: assign({
            transactionId: ({ event }) => event.output,
            toAddress: "" as Address,
            amount: 0,
          }),
        },
        onError: {
          target: "input",
          actions: assign({
            walletError: "Could not send transaction",
          }),
        },
      },
    },

    waitForTxReceipt: {
      invoke: {
        src: "waitForTxReceipt",
        input: ({ context }) => ({
          transactionId: context.transactionId as Address,
          walletClient: context.walletClient,
        }),
        onDone: {
          target: "done",
          actions: assign({
            walletError: "",
          }),
        },
      },
    },

    done: {
      after: {
        2000: {
          target: "input",
        },
      },
    },
  },
});

export default machine;
