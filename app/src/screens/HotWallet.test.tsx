import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { HotWalletSetup, HotWalletDetail } from "./HotWallet";
import { loadEncryptedMnemonic, decryptMnemonic, encryptMnemonic, saveEncryptedMnemonic } from "../lib/hotwallet-storage";
import { makeInvoice } from "../lib/nwc";
import { connectHotWallet, getHotWalletBalanceSats, sendHotWalletPayment } from "../lib/hotwallet-sdk";
import type { FamilyKid } from "../lib/storage";

// hotwallet-sdk.ts imports the real Breez SDK (WASM), which can't load in
// jsdom — mock it so these screens (which only need mnemonic generation,
// validation, and a fake connected "sdk" object) can be tested in isolation.
vi.mock("../lib/hotwallet-sdk", () => ({
  generateWalletMnemonic: () => "test test test test test test test test test test test junk",
  isValidMnemonic: (mnemonic: string) => {
    try {
      return validateMnemonic(mnemonic.trim(), wordlist);
    } catch {
      return false;
    }
  },
  connectHotWallet: vi.fn(async () => ({})),
  getHotWalletBalanceSats: vi.fn(async () => 5000),
  listHotWalletPayments: vi.fn(async () => []),
  receiveOnchainAddress: vi.fn(),
  receiveLightningInvoice: vi.fn(),
  sendHotWalletPayment: vi.fn(async () => ({})),
}));

// Real @getalby/sdk NWCClient doesn't need WASM, but mocking keeps this test
// isolated from real network/relay behavior and lets us assert on exactly
// what the hot wallet sent to a kid's connection.
vi.mock("../lib/nwc", () => ({
  makeInvoice: vi.fn(async (_url: string, amountSats: number) => ({ invoice: `lnbc-fake-${amountSats}` })),
  isDemoUrl: (url: string) => url.startsWith("demo://"),
}));

const VALID_PHRASE = "test test test test test test test test test test test junk";

const DEMO_KID: FamilyKid = { id: "k1", nickname: "Leo", nwcUrl: "demo://zapsavr/leo" };
const REAL_KID: FamilyKid = { id: "k2", nickname: "Mia", nwcUrl: "nostr+walletconnect://real-kid-connection" };

beforeEach(() => {
  localStorage.clear();
});

describe("HotWalletSetup — restore from backup", () => {
  it("rejects a phrase with the wrong number of words", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<HotWalletSetup pin="1234" onDone={onDone} onCancel={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Restore from a backup phrase instead" }));
    await user.click(screen.getByLabelText("Recovery phrase"));
    await user.paste("wrong word count");
    await user.click(screen.getByRole("button", { name: "Restore wallet" }));

    expect(await screen.findByText(/usually 12 words/i)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    expect(loadEncryptedMnemonic()).toBeNull();
  });

  it("rejects 12 words that don't pass the BIP39 checksum", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<HotWalletSetup pin="1234" onDone={onDone} onCancel={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Restore from a backup phrase instead" }));
    await user.click(screen.getByLabelText("Recovery phrase"));
    await user.paste("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon");
    await user.click(screen.getByRole("button", { name: "Restore wallet" }));

    expect(await screen.findByText(/doesn't look like a valid recovery phrase/i)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    expect(loadEncryptedMnemonic()).toBeNull();
  });

  it("accepts a valid BIP39 phrase, encrypts it, and calls onDone", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<HotWalletSetup pin="1234" onDone={onDone} onCancel={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Restore from a backup phrase instead" }));
    await user.click(screen.getByLabelText("Recovery phrase"));
    await user.paste(VALID_PHRASE);
    await user.click(screen.getByRole("button", { name: "Restore wallet" }));

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    const encrypted = loadEncryptedMnemonic();
    expect(encrypted).not.toBeNull();
    await expect(decryptMnemonic(encrypted!, "1234")).resolves.toBe(VALID_PHRASE);
  });

  it("is case- and whitespace-insensitive", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<HotWalletSetup pin="1234" onDone={onDone} onCancel={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Restore from a backup phrase instead" }));
    await user.click(screen.getByLabelText("Recovery phrase"));
    await user.paste("  TEST  test Test   test test test test test test test test JUNK  ");
    await user.click(screen.getByRole("button", { name: "Restore wallet" }));

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
  });
});

describe("HotWalletSetup — generate flow still works alongside restore", () => {
  it("still generates and confirms a new wallet by default", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<HotWalletSetup pin="1234" onDone={onDone} onCancel={() => {}} />);

    await user.click(screen.getByRole("button", { name: "I understand, continue" }));
    await user.click(screen.getByLabelText("I've written these words down somewhere safe"));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const words = VALID_PHRASE.split(" ");
    for (const label of screen.getAllByText(/^Word #\d+$/)) {
      const index = Number(label.textContent!.replace("Word #", "")) - 1;
      const input = label.parentElement!.querySelector("input")!;
      await user.type(input, words[index]);
    }
    await user.click(screen.getByRole("button", { name: "Confirm and create wallet" }));

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
  });
});

describe("HotWalletDetail — send to a kid", () => {
  beforeEach(async () => {
    vi.mocked(connectHotWallet).mockClear();
    vi.mocked(getHotWalletBalanceSats).mockClear().mockResolvedValue(5000);
    vi.mocked(sendHotWalletPayment).mockClear().mockResolvedValue({} as never);
    vi.mocked(makeInvoice).mockClear();
    saveEncryptedMnemonic(await encryptMnemonic(VALID_PHRASE, "1234"));
  });

  it("hides the 'send to a kid' option when there are no kids", async () => {
    const user = userEvent.setup();
    render(<HotWalletDetail pin="1234" network="mainnet" kids={[]} onBack={() => {}} onDeleted={() => {}} />);

    await user.click(await screen.findByRole("button", { name: "Send" }));
    expect(screen.queryByRole("button", { name: "👦 Send to a kid" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "🔗 Paste a payment request" })).toBeInTheDocument();
  });

  it("a demo kid gets credited without touching the real hot wallet balance", async () => {
    const user = userEvent.setup();
    render(
      <HotWalletDetail pin="1234" network="mainnet" kids={[DEMO_KID]} onBack={() => {}} onDeleted={() => {}} />
    );

    await user.click(await screen.findByRole("button", { name: "Send" }));
    await user.click(screen.getByRole("button", { name: "👦 Send to a kid" }));
    await user.click(screen.getByRole("button", { name: /Leo/ }));
    await user.type(screen.getByLabelText("Amount (sats)"), "500");
    await user.click(screen.getByRole("button", { name: "Send to Leo" }));

    expect(await screen.findByText(/Sent 500 sats to Leo/)).toBeInTheDocument();
    expect(makeInvoice).toHaveBeenCalledWith(DEMO_KID.nwcUrl, 500, "Allowance top-up");
    expect(sendHotWalletPayment).not.toHaveBeenCalled();
  });

  it("a real kid gets a real invoice paid from the hot wallet, and the balance reloads", async () => {
    const user = userEvent.setup();
    render(
      <HotWalletDetail pin="1234" network="mainnet" kids={[REAL_KID]} onBack={() => {}} onDeleted={() => {}} />
    );

    await user.click(await screen.findByRole("button", { name: "Send" }));
    await user.click(screen.getByRole("button", { name: "👦 Send to a kid" }));
    await user.click(screen.getByRole("button", { name: /Mia/ }));
    await user.type(screen.getByLabelText("Amount (sats)"), "1200");
    await user.click(screen.getByRole("button", { name: "Send to Mia" }));

    expect(await screen.findByText(/Sent 1200 sats to Mia/)).toBeInTheDocument();
    expect(makeInvoice).toHaveBeenCalledWith(REAL_KID.nwcUrl, 1200, "Allowance top-up");
    expect(sendHotWalletPayment).toHaveBeenCalledWith(expect.anything(), "lnbc-fake-1200");
    // Once on mount, once after the send reloads the balance.
    await vi.waitFor(() => expect(vi.mocked(getHotWalletBalanceSats)).toHaveBeenCalledTimes(2));
  });

  it("shows a clear error and no success message when the payment itself fails", async () => {
    vi.mocked(sendHotWalletPayment).mockRejectedValueOnce(new Error("insufficient balance"));
    const user = userEvent.setup();
    render(
      <HotWalletDetail pin="1234" network="mainnet" kids={[REAL_KID]} onBack={() => {}} onDeleted={() => {}} />
    );

    await user.click(await screen.findByRole("button", { name: "Send" }));
    await user.click(screen.getByRole("button", { name: "👦 Send to a kid" }));
    await user.click(screen.getByRole("button", { name: /Mia/ }));
    await user.type(screen.getByLabelText("Amount (sats)"), "1200");
    await user.click(screen.getByRole("button", { name: "Send to Mia" }));

    expect(await screen.findByText(/didn't go through/)).toBeInTheDocument();
    expect(screen.queryByText(/Sent 1200 sats to Mia/)).not.toBeInTheDocument();
  });
});
