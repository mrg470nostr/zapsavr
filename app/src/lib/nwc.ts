import { NWCClient } from "@getalby/sdk";
import {
  isDemoUrl,
  demoGetBalanceSats,
  demoGetBudget,
  demoMakeInvoice,
  demoPayInvoice,
  demoListTransactions,
} from "./demo";

/**
 * Every call here (outside demo mode) goes straight to the connection the
 * parent's own wallet issued (nostr+walletconnect://). ZapSavr never sees a
 * seed phrase and never enforces the budget itself — the parent's wallet
 * does that on every request, per the non-negotiable in CLAUDE.md.
 */

export { demoUrlFor } from "./demo";

export function isValidNwcUrl(url: string): boolean {
  const trimmed = url.trim();
  if (isDemoUrl(trimmed)) return true;
  try {
    NWCClient.parseWalletConnectUrl(trimmed);
    return true;
  } catch {
    return false;
  }
}

export { isDemoUrl };

export function connect(nwcUrl: string): NWCClient {
  return new NWCClient({ nostrWalletConnectUrl: nwcUrl.trim() });
}

export async function getBalanceSats(nwcUrl: string): Promise<number> {
  if (isDemoUrl(nwcUrl)) return demoGetBalanceSats(nwcUrl);
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
  if (isDemoUrl(nwcUrl)) return demoGetBudget(nwcUrl);
  const client = connect(nwcUrl);
  try {
    return await client.getBudget();
  } finally {
    client.close();
  }
}

export async function payInvoice(nwcUrl: string, invoice: string) {
  if (isDemoUrl(nwcUrl)) return demoPayInvoice(nwcUrl, invoice);
  const client = connect(nwcUrl);
  try {
    return await client.payInvoice({ invoice: invoice.trim() });
  } finally {
    client.close();
  }
}

export async function makeInvoice(nwcUrl: string, amountSats: number, description: string) {
  if (isDemoUrl(nwcUrl)) return demoMakeInvoice(nwcUrl, amountSats, description);
  const client = connect(nwcUrl);
  try {
    return await client.makeInvoice({ amount: amountSats * 1000, description });
  } finally {
    client.close();
  }
}

export type SimpleTx = {
  type: "incoming" | "outgoing";
  amountSats: number;
  description: string;
  at: number;
};

export async function listTransactions(nwcUrl: string, limit = 10): Promise<SimpleTx[]> {
  if (isDemoUrl(nwcUrl)) {
    return demoListTransactions(nwcUrl);
  }
  const client = connect(nwcUrl);
  try {
    const { transactions } = await client.listTransactions({ limit });
    return transactions.map((t) => ({
      type: t.type,
      amountSats: Math.floor(t.amount / 1000),
      description: t.description || (t.type === "incoming" ? "Received" : "Sent"),
      at: t.settled_at ? t.settled_at * 1000 : t.created_at * 1000,
    }));
  } finally {
    client.close();
  }
}
