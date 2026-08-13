import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SendPanel } from "./SendPanel";
import { payInvoice, previewInvoiceAmountSats } from "../lib/nwc";

vi.mock("../lib/nwc", () => ({
  payInvoice: vi.fn(),
  previewInvoiceAmountSats: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(payInvoice).mockReset();
  vi.mocked(previewInvoiceAmountSats).mockReset().mockReturnValue(null);
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

describe("SendPanel — pause before a big purchase (a kid-set nudge, not a lock)", () => {
  it("pays immediately, no extra step, when the amount is under the threshold", async () => {
    vi.mocked(previewInvoiceAmountSats).mockReturnValue(2000);
    vi.mocked(payInvoice).mockResolvedValue({ preimage: "abc", fees_paid: 0, amountSats: 2000 });
    const user = userEvent.setup();
    render(<SendPanel nwcUrl="demo://zapsavr/x" onClose={() => {}} confirmAboveSats={5000} />);

    await user.type(screen.getByPlaceholderText("Paste or scan the payment request"), "lnbc2000n...");
    await user.click(screen.getByRole("button", { name: "Pay" }));

    expect(await screen.findByText("Paid!")).toBeInTheDocument();
    expect(screen.queryByText("That's a big one")).not.toBeInTheDocument();
  });

  it("pauses for a second confirmation when the amount is over the threshold, without paying yet", async () => {
    vi.mocked(previewInvoiceAmountSats).mockReturnValue(9000);
    const user = userEvent.setup();
    render(<SendPanel nwcUrl="demo://zapsavr/x" onClose={() => {}} confirmAboveSats={5000} />);

    await user.type(screen.getByPlaceholderText("Paste or scan the payment request"), "lnbc9000n...");
    await user.click(screen.getByRole("button", { name: "Pay" }));

    expect(await screen.findByText("That's a big one")).toBeInTheDocument();
    expect(payInvoice).not.toHaveBeenCalled();
  });

  it("only pays after the kid explicitly confirms past the pause screen", async () => {
    vi.mocked(previewInvoiceAmountSats).mockReturnValue(9000);
    vi.mocked(payInvoice).mockResolvedValue({ preimage: "abc", fees_paid: 0, amountSats: 9000 });
    const user = userEvent.setup();
    render(<SendPanel nwcUrl="demo://zapsavr/x" onClose={() => {}} confirmAboveSats={5000} />);

    await user.type(screen.getByPlaceholderText("Paste or scan the payment request"), "lnbc9000n...");
    await user.click(screen.getByRole("button", { name: "Pay" }));
    await screen.findByText("That's a big one");
    await user.click(screen.getByRole("button", { name: "Yes, pay" }));

    expect(await screen.findByText("Paid!")).toBeInTheDocument();
  });

  it("'wait, let me think' backs out without paying", async () => {
    vi.mocked(previewInvoiceAmountSats).mockReturnValue(9000);
    const user = userEvent.setup();
    render(<SendPanel nwcUrl="demo://zapsavr/x" onClose={() => {}} confirmAboveSats={5000} />);

    await user.type(screen.getByPlaceholderText("Paste or scan the payment request"), "lnbc9000n...");
    await user.click(screen.getByRole("button", { name: "Pay" }));
    await screen.findByText("That's a big one");
    await user.click(screen.getByRole("button", { name: "Wait, let me think" }));

    expect(screen.getByRole("button", { name: "Pay" })).toBeInTheDocument();
    expect(payInvoice).not.toHaveBeenCalled();
  });
});
