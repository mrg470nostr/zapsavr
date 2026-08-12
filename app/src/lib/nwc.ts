import { NWCClient } from "@getalby/sdk";

/**
 * Every call here goes straight to the connection the parent's own wallet
 * issued (nostr+walletconnect://). ZapSavr never sees a seed phrase and
 * never enforces the budget itself — the parent's wallet does that on
 * every request, per the non-negotiable in CLAUDE.md.
 */

export function isValidNwcUrl(url: string): boolean {
  try {
    NWCClient.parseWalletConnectUrl(url.trim());
    return true;
  } catch {
    return false;
  }
}

export function connect(nwcUrl: string): NWCClient {
  return new NWCClient({ nostrWalletConnectUrl: nwcUrl.trim() });
}

export async function getBalanceSats(nwcUrl: string): Promise<number> {
  const client = connect(nwcUrl);
  try {
    const { balance } = await client.getBalance();
    // NIP-47 balance is in msats.
    return Math.floor(balance / 1000);
  } finally {
    client.close();
  }
}

export async function getBudget(nwcUrl: string) {
  const client = connect(nwcUrl);
  try {
    return await client.getBudget();
  } finally {
    client.close();
  }
}

export async function payInvoice(nwcUrl: string, invoice: string) {
  const client = connect(nwcUrl);
  try {
    return await client.payInvoice({ invoice: invoice.trim() });
  } finally {
    client.close();
  }
}

export async function makeInvoice(nwcUrl: string, amountSats: number, description: string) {
  const client = connect(nwcUrl);
  try {
    return await client.makeInvoice({ amount: amountSats * 1000, description });
  } finally {
    client.close();
  }
}
