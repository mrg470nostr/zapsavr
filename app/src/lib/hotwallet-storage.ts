// The lightweight half of the embedded hot wallet: local storage and
// PIN-derived at-rest encryption, both using only the Web Crypto API
// (native, zero bundle cost). Deliberately split out from hotwallet-sdk.ts
// (which pulls in the multi-megabyte Breez SDK + WASM) so that a cheap check
// like hasHotWallet() — called eagerly on every family-dashboard render —
// never forces every visitor to download the SDK. See
// docs/ARCHITECTURE.md "Embedded hot wallet (experimental, opt-in)".

export type HotWalletNetwork = "mainnet" | "regtest";

// Honest limitation: a 4-digit parent PIN has only 10,000 possible values.
// This is real protection against casually reading the seed out of
// localStorage, not against a determined attacker who has a copy of the
// ciphertext and time to brute-force offline. Don't describe this as
// "secure" without that caveat — see docs/SECURITY.md.

export type EncryptedMnemonic = { ciphertext: string; salt: string; iv: string };

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 210_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptMnemonic(mnemonic: string, pin: string): Promise<EncryptedMnemonic> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, new TextEncoder().encode(mnemonic));
  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
  };
}

export async function decryptMnemonic(encrypted: EncryptedMnemonic, pin: string): Promise<string> {
  const salt = base64ToBytes(encrypted.salt);
  const iv = base64ToBytes(encrypted.iv);
  const key = await deriveKey(pin, salt);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    base64ToBytes(encrypted.ciphertext) as BufferSource
  );
  return new TextDecoder().decode(plain);
}

// ---------- Local storage (ciphertext only, never the plain mnemonic) ----------

const STORAGE_KEY = "zapsavr.hotwallet.v1";

export function hasHotWallet(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export function saveEncryptedMnemonic(encrypted: EncryptedMnemonic) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
}

export function loadEncryptedMnemonic(): EncryptedMnemonic | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EncryptedMnemonic;
  } catch {
    return null;
  }
}

export function clearHotWallet() {
  localStorage.removeItem(STORAGE_KEY);
}
