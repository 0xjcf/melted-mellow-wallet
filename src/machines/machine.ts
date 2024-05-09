import { assign, fromPromise, setup } from "xstate";
import { z } from "zod";
import {
  createWalletClient,
  custom,
  getContract,
  publicActions,
  parseUnits,
  Address,
} from "viem";

import { avalancheFuji } from "viem/chains";
import abi from "../abi/abi.json";

import type {
  SendToMachineContext,
  SendToMachineEvents,
  GetBalanceInput,
  SubmitTransactionInput,
} from "../types/types";

const walletClient = createWalletClient({
  chain: avalancheFuji,
  transport: custom(window.ethereum!),
}).extend(publicActions);

const usdcContractAddress = "0x5425890298aed601595a70AB815c96711a31Bc65";

const machine = setup({
  types: {
    context: {} as SendToMachineContext,
    events: {} as SendToMachineEvents,

    input: {} as {
      address: Address;
      toAddress: Address;
    },
  },

  actors: {
    getAddress: fromPromise(async () => {
      const [address] = await walletClient.getAddresses();

      return address;
    }),

    getDecimals: fromPromise(async () => {
      const contract = getContract({
        address: usdcContractAddress,
        abi,
        client: walletClient,
      });

      const decimals = await contract.read.decimals();

      return decimals as number;
    }),

    getBalance: fromPromise(async ({ input }: { input: GetBalanceInput }) => {
      const rawBalance = (await walletClient.readContract({
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
          const hash = await walletClient.writeContract({
            address: usdcContractAddress,
            abi,
            functionName: "transfer",
            args: [input.toAddress, amount],
            account: input.address,
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
      async ({ input }: { input: { transactionId: Address } }) => {
        const transaction = await walletClient.waitForTransactionReceipt({
          hash: input.transactionId,
        });

        console.log(transaction);

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
  /** @xstate-layout N4IgpgJg5mDOIC5QBcBOBDAdrdBjZAlgPaYBiRqAtgHQDu6ANg2MgMQQljWzLrJdosOfMTIUa9JiwDaABgC6iUAAcisAoRJKQAD0QB2WQE5q+gEwA2AKxGrARjNGAHFYtmANCACeBgCx3qWSt7Yycnc1c7AF8oz0FsPE0xKjpGZmRqGGQAQQgIVDhYdk5qAkwANyIAawEMBJESchTJdMyWXPzChDLK3D5ROXlB7VV1JO09BDN9X2orQ2nF2VlfVd9PHwR-C2ojfQsjOxcrMyc7fRi4uuEkpok0ljacvILYIrBUVApqZQY+ADNxNR4jdRHdUlIMlkOq9YN0KkQ+klBsMkCBRhpRBNEE4PN5EHZZPoAMzUCzE4lmXxmOzE-S4imXEAgxJgoEtR5ZABCjCwuDAxUwXB61VqQlZjXZDyhLB5f0w-PhvX6JBRChGakxWjRk0c+jJvichuOK1cFg2OIssl2xOWTiM1n2VLMTJZDWS90hTzlfIFHy+qB+f2QgJSbtuUq93N5CrASsRKswasUaIx4x1iD1BqNYWCpos5vxCFss2JTkprisdMsxld1wlHtKmGUAFc2LAWwAjSgaVEqTXp0CTQmnahl3wO-RGakzWROC0ISk7U7Eix2PZHWlOCx18Xu8FlVsZdAvQqsQ9t4FEGGFPvogdYjMIM6zCe+KxOYzE9-6E4L8lONQhLrquS76PsTi7vUEYpBex6UEQLaYGwcHUOgCFIcgd5po+Q44lS1A1kcljhFWhoLlOgFBFYxhmJSU72FYUGgpKKTlIwBAQHwAocEK3C8PwwL1vuQLsQwnHcdhD7anhCDnLahG4rYVrEuc9J4psdhmrsYTEicFjmBYE7MQ24JiRJ-CsB23a9uqqbSZg2JyVO+puHOhh2L4FjbmYGkEmWuxGEFexvp5FyxMywkwTQ5lcYJJ6dG857NpeyDXqebxSWMuG6ASH47EYshUssshrhSVgLpYsxFcsoFEjS3kmSJbEcXFXAJbCpSwLIOg3klWVao5T5bjsBb+DYXlVvaxILic1UUnOVjvr4siEkYTXRdQsXcWhGWwF1PV9UU0h2Cm-bZTJuVyWWo1GVp07WGWRgzUWRmAdOexruWBzLExEXhmyLXiW1u2JftBCwNSADCAAW6CoEdrADYOV3nL4pLnOuaxhJYlgLl5AS+CS8leeBdjWH9Vx7pt23xXtXXQ3DCN7Ujp0ahdQ2yWjGP6Fjqw424habDR+pE6pYSGWcpyU5F1OAzFrU7ehiHIclR5oRhyHIzlw4TUBBnhHRU7UkaFGfrsRWFZ+8xEq4G3y1tivxZrGS4DDYC4FUSN2edg1ObSxImFWhxmCcjgfjMC4ltQLhWmV65mKt63-VFDu0+1LvUG7HteydZ33hz-sUkHgcOGHtjhOsRaEssMeuESjpKWc9usTQ1k9mwvHCgiNRCXLrfcF2HfxkiAwKNrl3Do4Y5UmWkTk3s5YLuuvNAf4hqhy4NK4i3jaCJ7grd5UvcAwP+9VCPibJuzftPraAREi+hUkvY5hV5pJKzAHieWM93nk7vcEXdWA6B4Erf4-BUAAApbTLAAJSsFPo2LuE9OZXTCAEcwLhnrOF5mWPyck7BEJ0vfCa-M-oRUwEQCAcBtBILuDfFGkwAC0VJZqE2CtOLSr8JwOkAZGdIjCdaZnfogSkJgiYHFnkZImc5+HNGlE8I6QjJ4GAIUtUk6Nlj7GcDSBw4UqbQQdhyGUyAfSxhUWgyYewo5aTJBSOiq5K64l8PIz0rQOy4H5G8SxTlJGERfqtQkhhrC2AXBgskZozh7CCvJNxEJWj+goL4p8XlSTTD0kEokpUbAVSLEYSw9jKRi1xG-ZOhiWKNhMdQJJgZoR7RSbJewAQMk0SIdk0JeTNL1SKb5MK30XQp37lUxRtTvQxn5I0q6zSAmZPaSE3Jy9VpfwcXOCuqlqTxLglMyY+wdhvg-F+H8f4ix5jJEnGuFJfxeS2SlY8DT7KFyfEaKw1AVpzlWLIVSBT6QUUDnMPMlEiSFTpLc9WytMI7JxETQIVo9iuETnpOi4SgpzDnHRQ5z8d5DKMQPdOULCHvjmM9csJIjKR2rvsOYidVrLE8ljAxstcWNnTqDWEBKiHPWJWWOkq4iaiMXDCsW5xF7lnRjuHFlSzJO3avTCGh0Hm+yYQSKkAQbA8rJfy-85JTA2FCc9VcvlylMqlaJGVbLCgMzMLDeGyjHm3y5gi3Ynk6IARJN+WavlFK2m3AyKsJx4mso6pazx3j4D2uVXJac+obZ9IMjVaY+Nvy7GJiScwVVnqBvNcGt4NTPjJIjcIqNMLY0NQWEVfQ2qzC7EsEuK0RV7QSoqaZM1wMlYuw5SBblpK+UUs2NuUs9dGL4KKjLehraLIZxVq7d2nsOWqu7by8lArbBB18sTVYicDKuMlS2oGk6NbTsHl4woHKqxquBatbycdyZR3sHXK04FywOCpE2k1e6FZtudke2pZ7VJoqnFe7cpVb3VyKtW9FhgXzzAevE9uGgCXgRMBsw4RVqxaqLInWkhFeHeW+XsYk8Tz4EoMsvQwJhyTFILCSApRD4ldwJfaV5v5nAGT0jYddy9SaEXJBOQOBTnDnBiDEIAA */
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
  },

  id: "transactionForm",

  initial: "wallet",

  states: {
    wallet: {
      initial: "getAddress",

      states: {
        getAddress: {
          invoke: {
            src: "getAddress",
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
