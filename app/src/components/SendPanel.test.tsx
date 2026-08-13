import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SendPanel } from "./SendPanel";
import { payInvoice } from "../lib/nwc";

vi.mock("../lib/nwc", () => ({
  payInvoice: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(payInvoice).mockReset();
});

describe("SendPanel — must never show success on a failed payment", () => {
  it("shows the failure message and stays on the pay screen when payInvoice rejects", async () => {
    vi.mocked(payInvoice).mockRejectedValue(new Error("connection revoked"));
    const user = userEvent.setup();
    const onPaid = vi.fn();
    render(<SendPanel nwcUrl="demo://zapsavr/x" onClose={() => {}} onPaid={onPaid} />);

    await user.type(screen.getByPlaceholderText("Paste or scan the payment request"), "lnbc1000n...");
    await user.click(screen.getByRole("button", { name: "Pay" }));

    expect(await screen.findByText(/didn't go through/i)).toBeInTheDocument();
    expect(screen.queryByText("Paid!")).not.toBeInTheDocument();
    expect(onPaid).not.toHaveBeenCalled();
  });

  it("shows Paid! and reports the amount only when payInvoice actually resolves", async () => {
    vi.mocked(payInvoice).mockResolvedValue({ preimage: "abc", fees_paid: 0, amountSats: 2500 });
    const user = userEvent.setup();
    const onPaid = vi.fn();
    render(<SendPanel nwcUrl="demo://zapsavr/x" onClose={() => {}} onPaid={onPaid} />);

    await user.type(screen.getByPlaceholderText("Paste or scan the payment request"), "lnbc2500n...");
    await user.click(screen.getByRole("button", { name: "Pay" }));

    expect(await screen.findByText("Paid!")).toBeInTheDocument();
    expect(onPaid).toHaveBeenCalledWith(2500);
  });

  it("the Pay button is disabled with no invoice entered, so nothing can be submitted blank", () => {
    render(<SendPanel nwcUrl="demo://zapsavr/x" onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Pay" })).toBeDisabled();
  });
});
