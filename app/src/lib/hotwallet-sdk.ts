// EXPERIMENTAL, opt-in only. Everything else in this app deliberately never
// holds a seed phrase (see CLAUDE.md's non-negotiable #2) — this is the one
// deliberate, clearly-labeled exception, built at the parent's explicit
// request to understand the trade-off, not because it's the recommended
// path. See docs/ARCHITECTURE.md "Embedded hot wallet (experimental,
// opt-in)" for the full reasoning, and docs/SECURITY.md for the honest
// limits of the at-rest encryption in hotwallet-storage.ts.
//
// Verified for real against Breez's shared, free, no-API-key-required
// "regtest" network (see docs/ARCHITECTURE.md "Embedded hot wallet"):
// connect(), getInfo(), listPayments(), and receivePayment(bitcoinAddress)
// all succeed against live infrastructure. Not yet verified: actually
// receiving faucet funds (blocked by the faucet's own bot-detection, not
// something to route around), sending a payment, or Lightning on any
// network (regtest has no functioning Lightning network per Breez's docs,
// so that needs mainnet + a real API key to check). Don't claim more than
// that to whoever picks this up next.
//
// Deliberately its own module, separate from hotwallet-storage.ts: this file
// pulls in the multi-megabyte Breez SDK + WASM, so every import site must be
// behind a lazy `import()` (see screens/HotWallet.tsx and its lazy loading
// in ParentFlow.tsx) — never imported eagerly from app startup code.

import { generateMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import initBreezSdkWasm, { connect, defaultConfig, type BreezSdk, type Payment } from "@breeztech/breez-sdk-spark/web";
import type { HotWalletNetwork } from "./hotwallet-storage";

let wasmReady: Promise<void> | null = null;
function ensureWasmLoaded(): Promise<void> {
  if (!wasmReady) wasmReady = initBreezSdkWasm();
  return wasmReady;
}

// ---------- Mnemonic ----------

export function generateWalletMnemonic(): string {
  // 128 bits of entropy -> 12 words. Cryptographically-random per @scure/bip39.
  return generateMnemonic(wordlist, 128);
}

export function isValidMnemonic(mnemonic: string): boolean {
  try {
    return validateMnemonic(mnemonic.trim(), wordlist);
  } catch {
    return false;
  }
}

// ---------- Breez SDK - Spark operations ----------

export async function connectHotWallet(mnemonic: string, network: HotWalletNetwork, apiKey?: string): Promise<BreezSdk> {
  await ensureWasmLoaded();
  const config = defaultConfig(network);
  if (apiKey) config.apiKey = apiKey;
  return connect({
    config,
    seed: { type: "mnemonic", mnemonic: mnemonic.trim() },
    storageDir: "zapsavr-hotwallet",
  });
}

export async function getHotWalletBalanceSats(sdk: BreezSdk): Promise<number> {
  const info = await sdk.getInfo({});
  return info.balanceSats;
}

export async function receiveOnchainAddress(sdk: BreezSdk): Promise<string> {
  const res = await sdk.receivePayment({ paymentMethod: { type: "bitcoinAddress" } });
  return res.paymentRequest;
}

export async function receiveLightningInvoice(sdk: BreezSdk, amountSats: number, description: string): Promise<string> {
  const res = await sdk.receivePayment({
    paymentMethod: { type: "bolt11Invoice", description, amountSats },
  });
  return res.paymentRequest;
}

export async function sendHotWalletPayment(sdk: BreezSdk, paymentRequest: string, amountSats?: number): Promise<Payment> {
  const prepared = await sdk.prepareSendPayment({
    paymentRequest: { type: "input", input: paymentRequest.trim() },
    amount: amountSats !== undefined ? BigInt(amountSats) : undefined,
  });
  const result = await sdk.sendPayment({ prepareResponse: prepared });
  return result.payment;
}

export type SimpleHotWalletTx = {
  type: "incoming" | "outgoing";
  amountSats: number;
  status: "completed" | "pending" | "failed";
  at: number;
};

export async function listHotWalletPayments(sdk: BreezSdk): Promise<SimpleHotWalletTx[]> {
  const res = await sdk.listPayments({});
  return res.payments.map((p) => ({
    type: p.paymentType === "receive" ? "incoming" : "outgoing",
    amountSats: Number(p.amount),
    status: p.status,
    at: p.timestamp * 1000,
  }));
}
