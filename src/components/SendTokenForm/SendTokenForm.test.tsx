import {
  mockUseMachine,
  render,
  screen,
  userEvent,
} from "../../utils/test-utils";
import SendTokenForm from "./SendTokenForm";

jest.mock("../../machines/", () => ({
  useMachine: jest.fn(),
}));

describe("SendTokenForm", () => {
  it("displays loading address message when in wallet.getAddress state", () => {
    mockUseMachine({
      matches: (state: Record<string, string>) => state.wallet === "getAddress",
      context: {},
    });
    render(<SendTokenForm />);
    expect(screen.getByText("Loading Address...")).toBeInTheDocument();
  });

  it("displays loading wallet settings message when in wallet.getDecimals state", () => {
    mockUseMachine({
      matches: (state: Record<string, string>) =>
        state.wallet === "getDecimals",
      context: {},
    });
    render(<SendTokenForm />);
    expect(screen.getByText("Loading Wallet Settings...")).toBeInTheDocument();
  });

  it("displays loading balance message when in wallet.getBalance state", () => {
    mockUseMachine({
      matches: (state: Record<string, string>) => state.wallet === "getBalance",
      context: {},
    });
    render(<SendTokenForm />);
    expect(screen.getByText("Loading Balance...")).toBeInTheDocument();
  });

  it("displays wallet error message when in wallet.error state", () => {
    mockUseMachine({
      matches: (state: Record<string, string>) => state.wallet === "error",
      context: {
        walletError: "Could not fetch address",
      },
    });
    render(<SendTokenForm />);
    expect(screen.getByText("Could not fetch address")).toBeInTheDocument();
  });

  it("displays available balance when in a connected to the wallet & valid state", () => {
    mockUseMachine({
      matches: (state: Record<string, string>) => state.wallet === "input",
      context: {
        balance: 100,
      },
    });
    render(<SendTokenForm />);
    expect(screen.getByText("Available Balance: 100 USDC")).toBeInTheDocument();
  });

  it("displays the correct address when user types into address input", async () => {
    mockUseMachine({
      matches: (state: Record<string, string>) => state.wallet === "input",
      context: {
        balance: 100,
      },
    });
    render(<SendTokenForm />);
    const addressInput = screen.getByLabelText("Send To");
    await userEvent.type(addressInput, "0x1234");
    expect(addressInput).toHaveValue("0x1234");
  });

  it("displays the correct amount when user types into amount input", async () => {
    mockUseMachine({
      matches: (state: Record<string, string>) => state.wallet === "input",
      context: {
        balance: 100,
      },
    });
    render(<SendTokenForm />);
    const amountInput = screen.getByLabelText("USDC");
    await userEvent.type(amountInput, "50");
    expect(amountInput).toHaveValue(50);
  });

  it("displays a grey (disabled) button when user sends transaction", async () => {
    mockUseMachine({
      matches: (state: Record<string, string>) => state.wallet === "input",
      context: {
        balance: 100,
      },
    });
    render(<SendTokenForm />);
    const sendTokenButton = screen.getByRole("button");
    await userEvent.click(sendTokenButton);
    // TODO figure out how to check for the color here
  });

  it("displays a green button when transaction receipt received", async () => {
    mockUseMachine({
      matches: (state: Record<string, string>) => state.wallet === "done",
      context: {
        balance: 100,
      },
    });
    render(<SendTokenForm />);
    const sendTokenButton = screen.getByRole("button");
    await userEvent.click(sendTokenButton);
    // TODO figure out how to check for the color here
  });
});
