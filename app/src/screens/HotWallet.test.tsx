import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { HotWalletSetup } from "./HotWallet";
import { loadEncryptedMnemonic, decryptMnemonic } from "../lib/hotwallet-storage";

// hotwallet-sdk.ts imports the real Breez SDK (WASM), which can't load in
// jsdom — mock it so HotWalletSetup (which only needs mnemonic generation
// and validation, not a live connection) can be tested in isolation.
vi.mock("../lib/hotwallet-sdk", () => ({
  generateWalletMnemonic: () => "test test test test test test test test test test test junk",
  isValidMnemonic: (mnemonic: string) => {
    try {
      return validateMnemonic(mnemonic.trim(), wordlist);
    } catch {
      return false;
    }
  },
}));

const VALID_PHRASE = "test test test test test test test test test test test junk";

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
