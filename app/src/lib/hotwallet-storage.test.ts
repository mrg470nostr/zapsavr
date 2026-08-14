import { describe, it, expect, beforeEach } from "vitest";
import {
  encryptMnemonic,
  decryptMnemonic,
  hasHotWallet,
  saveEncryptedMnemonic,
  loadEncryptedMnemonic,
  clearHotWallet,
} from "./hotwallet-storage";

const SAMPLE_MNEMONIC = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

beforeEach(() => {
  localStorage.clear();
});

describe("encryptMnemonic / decryptMnemonic", () => {
  it("round-trips the plaintext with the correct PIN", async () => {
    const encrypted = await encryptMnemonic(SAMPLE_MNEMONIC, "1234");
    expect(await decryptMnemonic(encrypted, "1234")).toBe(SAMPLE_MNEMONIC);
  });

  it("produces different ciphertext and salt/iv each time (random salt/iv)", async () => {
    const a = await encryptMnemonic(SAMPLE_MNEMONIC, "1234");
    const b = await encryptMnemonic(SAMPLE_MNEMONIC, "1234");
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
  });

  it("fails to decrypt with the wrong PIN", async () => {
    const encrypted = await encryptMnemonic(SAMPLE_MNEMONIC, "1234");
    await expect(decryptMnemonic(encrypted, "9999")).rejects.toThrow();
  });

  it("never stores the plaintext mnemonic in the ciphertext field", async () => {
    const encrypted = await encryptMnemonic(SAMPLE_MNEMONIC, "1234");
    expect(encrypted.ciphertext).not.toContain("abandon");
  });
});

describe("hot wallet local storage", () => {
  it("reports no wallet before one is saved", () => {
    expect(hasHotWallet()).toBe(false);
    expect(loadEncryptedMnemonic()).toBeNull();
  });

  it("saves and loads the encrypted mnemonic, never the plaintext", async () => {
    const encrypted = await encryptMnemonic(SAMPLE_MNEMONIC, "1234");
    saveEncryptedMnemonic(encrypted);
    expect(hasHotWallet()).toBe(true);
    expect(loadEncryptedMnemonic()).toEqual(encrypted);
    expect(localStorage.getItem("zapsavr.hotwallet.v1")).not.toContain("abandon");
  });

  it("clears the wallet", async () => {
    saveEncryptedMnemonic(await encryptMnemonic(SAMPLE_MNEMONIC, "1234"));
    clearHotWallet();
    expect(hasHotWallet()).toBe(false);
  });

  it("returns null for corrupted storage instead of throwing", () => {
    localStorage.setItem("zapsavr.hotwallet.v1", "not json");
    expect(loadEncryptedMnemonic()).toBeNull();
  });
});
