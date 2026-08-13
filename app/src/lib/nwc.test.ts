import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isValidNwcUrl,
  decodeInvoiceAmountSats,
  previewInvoiceAmountSats,
  payInvoice,
  getBalanceSats,
  listTransactions,
  demoUrlFor,
} from "./nwc";

const mockParseWalletConnectUrl = vi.fn();
const mockClose = vi.fn();
const mockGetBalance = vi.fn();
const mockPayInvoice = vi.fn();
const mockListTransactions = vi.fn();

vi.mock("@getalby/sdk", () => {
  class MockNWCClient {
    static parseWalletConnectUrl(url: string) {
      return mockParseWalletConnectUrl(url);
    }
    getBalance = mockGetBalance;
    payInvoice = mockPayInvoice;
    listTransactions = mockListTransactions;
    close = mockClose;
  }
  return { NWCClient: MockNWCClient };
});

const mockDecode = vi.fn();
vi.mock("light-bolt11-decoder", () => ({
  decode: (invoice: string) => mockDecode(invoice),
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("isValidNwcUrl", () => {
  it("accepts demo urls without touching the real parser", () => {
    expect(isValidNwcUrl(demoUrlFor("leo"))).toBe(true);
    expect(mockParseWalletConnectUrl).not.toHaveBeenCalled();
  });

  it("delegates real urls to NWCClient's parser and returns true when it doesn't throw", () => {
    mockParseWalletConnectUrl.mockReturnValue({});
    expect(isValidNwcUrl("nostr+walletconnect://looks-real")).toBe(true);
  });

  it("returns false, not a thrown error, when the parser rejects the string", () => {
    mockParseWalletConnectUrl.mockImplementation(() => {
      throw new Error("bad url");
    });
    expect(isValidNwcUrl("garbage")).toBe(false);
  });
});

describe("decodeInvoiceAmountSats", () => {
  it("floors the BOLT11 msat amount down to whole sats", () => {
    mockDecode.mockReturnValue({ sections: [{ name: "amount", value: "2500500" }] });
    expect(decodeInvoiceAmountSats("lnbc...")).toBe(2500); // 2,500,500 msat -> 2500 sat, remainder dropped
  });

  it("returns null for 'any amount' invoices that don't encode a value", () => {
    mockDecode.mockReturnValue({ sections: [{ name: "description", value: "coffee" }] });
    expect(decodeInvoiceAmountSats("lnbc...")).toBeNull();
  });

  it("returns null instead of throwing when the string isn't decodable", () => {
    mockDecode.mockImplementation(() => {
      throw new Error("not bech32");
    });
    expect(decodeInvoiceAmountSats("not-an-invoice")).toBeNull();
  });
});

describe("previewInvoiceAmountSats — used for the pre-payment big-purchase pause", () => {
  it("decodes real invoices the same way decodeInvoiceAmountSats does", () => {
    mockDecode.mockReturnValue({ sections: [{ name: "amount", value: "7000000" }] });
    expect(previewInvoiceAmountSats("nostr+walletconnect://x", "lnbc...")).toBe(7000);
  });

  it("reads the digit hint out of a demo invoice instead of trying real BOLT11 decoding", () => {
    const url = demoUrlFor(`preview-${Math.random()}`);
    expect(previewInvoiceAmountSats(url, "lnbc-demo-3000-abc123")).toBe(3000);
    expect(mockDecode).not.toHaveBeenCalled();
  });

  it("returns null for a demo invoice with no recognizable amount", () => {
    const url = demoUrlFor(`preview-${Math.random()}`);
    expect(previewInvoiceAmountSats(url, "no-digits-here")).toBeNull();
  });
});

describe("payInvoice — never show false success", () => {
  it("propagates a wallet-side failure instead of swallowing it", async () => {
    mockDecode.mockReturnValue({ sections: [] });
    mockPayInvoice.mockRejectedValue(new Error("connection revoked"));

    await expect(payInvoice("nostr+walletconnect://x", "lnbc...")).rejects.toThrow("connection revoked");
  });

  it("still closes the client even when the payment fails, so connections aren't leaked", async () => {
    mockDecode.mockReturnValue({ sections: [] });
    mockPayInvoice.mockRejectedValue(new Error("down"));

    await expect(payInvoice("nostr+walletconnect://x", "lnbc...")).rejects.toThrow();
    expect(mockClose).toHaveBeenCalledOnce();
  });

  it("on success, carries the decoded invoice amount alongside the wallet's response", async () => {
    mockDecode.mockReturnValue({ sections: [{ name: "amount", value: "1000000" }] });
    mockPayInvoice.mockResolvedValue({ preimage: "abc", fees_paid: 1 });

    const result = await payInvoice("nostr+walletconnect://x", "lnbc...");
    expect(result).toEqual({ preimage: "abc", fees_paid: 1, amountSats: 1000 });
  });

  it("demo payments never let a kid overdraw their demo balance", async () => {
    const url = demoUrlFor(`test-${Math.random()}`);
    await expect(payInvoice(url, "lnbc999999n")).rejects.toThrow();
  });
});

describe("getBalanceSats — never show a stale/fake balance on failure", () => {
  it("converts msat to sat on success", async () => {
    mockGetBalance.mockResolvedValue({ balance: 42000 });
    expect(await getBalanceSats("nostr+walletconnect://x")).toBe(42);
  });

  it("propagates the failure when the connection is unreachable", async () => {
    mockGetBalance.mockRejectedValue(new Error("unreachable"));
    await expect(getBalanceSats("nostr+walletconnect://x")).rejects.toThrow("unreachable");
  });
});

describe("listTransactions", () => {
  it("maps NIP-47 transactions to the simplified shape, msat to sat", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [
        { type: "incoming", amount: 3000000, description: "", settled_at: 1000, created_at: 900 },
        { type: "outgoing", amount: 500000, description: "Snack", settled_at: 0, created_at: 800 },
      ],
    });
    const txs = await listTransactions("nostr+walletconnect://x");
    expect(txs).toEqual([
      { type: "incoming", amountSats: 3000, description: "Received", at: 1000000 },
      { type: "outgoing", amountSats: 500, description: "Snack", at: 800000 },
    ]);
  });
});
