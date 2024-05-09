import { RenderOptions, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMachine } from "@xstate/react";
import { ReactElement } from "react";

jest.mock("@xstate/react", () => ({
  useMachine: jest.fn(),
}));

export const mockUseMachine = (state: Record<string, unknown>) => {
  (useMachine as jest.Mock).mockImplementation(() => [state, jest.fn()]);
};

const customRender = (ui: ReactElement, options?: RenderOptions) => {
  return render(ui, { ...options });
};

export * from "@testing-library/react";
export { customRender as render, userEvent };
