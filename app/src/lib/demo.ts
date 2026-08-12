// Demo mode: lets someone click through the whole app with no real wallet,
// no NWC connection, and no KYC of any kind — purely local, fake numbers.
// Each demo "kid" gets its own isolated balance/history, keyed by the demo
// URL itself, so a family demo with several kids doesn't collide.
export const DEMO_PREFIX = "demo://zapsavr/";

export function isDemoUrl(url: string): boolean {
  return url.startsWith(DEMO_PREFIX);
}

export function demoUrlFor(label: string): string {
  return `${DEMO_PREFIX}${label}`;
}

export type DemoTx = {
  type: "incoming" | "outgoing";
  amountSats: number;
  description: string;
  at: number;
};

const BUDGET_TOTAL_SATS = 20000;

function balanceKey(url: string) {
  return `zapsavr.demo.balance.${url}`;
}
function txKey(url: string) {
  return `zapsavr.demo.tx.${url}`;
}

function readBalance(url: string): number {
  const raw = localStorage.getItem(balanceKey(url));
  return raw !== null ? parseInt(raw, 10) : 8000;
}

function writeBalance(url: string, sats: number) {
  localStorage.setItem(balanceKey(url), String(Math.max(0, sats)));
}

function readTx(url: string): DemoTx[] {
  const raw = localStorage.getItem(txKey(url));
  return raw ? JSON.parse(raw) : [];
}

function appendTx(url: string, tx: DemoTx) {
  const list = [tx, ...readTx(url)].slice(0, 20);
  localStorage.setItem(txKey(url), JSON.stringify(list));
}

export function resetDemo(url: string) {
  localStorage.removeItem(balanceKey(url));
  localStorage.removeItem(txKey(url));
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function demoGetBalanceSats(url: string): Promise<number> {
  await wait(300);
  return readBalance(url);
}

export async function demoGetBudget(url: string) {
  await wait(300);
  const balance = readBalance(url);
  const used = Math.max(0, BUDGET_TOTAL_SATS - balance);
  return { used_budget: used * 1000, total_budget: BUDGET_TOTAL_SATS * 1000 };
}

export async function demoListTransactions(url: string): Promise<DemoTx[]> {
  await wait(250);
  return readTx(url);
}

export async function demoMakeInvoice(url: string, amountSats: number, description: string) {
  await wait(400);
  // No second device to actually pay it in a solo demo — credit instantly
  // so the jar visibly fills, same as the real "someone paid it" moment would.
  writeBalance(url, readBalance(url) + amountSats);
  appendTx(url, { type: "incoming", amountSats, description, at: Date.now() });
  return {
    invoice: `lnbc-demo-${amountSats}-${Math.random().toString(36).slice(2, 10)}`,
    description,
  };
}

export async function demoPayInvoice(url: string, invoice: string) {
  await wait(500);
  const balance = readBalance(url);
  // Fake spend amount: a small, plausible "snack at a market stall" size,
  // unless the pasted text itself hints at an amount.
  const hinted = invoice.match(/(\d{2,6})/);
  const amount = hinted ? Math.min(parseInt(hinted[1], 10), balance) : Math.min(1500, balance);
  if (amount <= 0 || amount > balance) {
    throw new Error("Not enough in the demo balance for that.");
  }
  writeBalance(url, balance - amount);
  appendTx(url, { type: "outgoing", amountSats: amount, description: "Payment", at: Date.now() });
  return { preimage: "demo", fees_paid: 0, amount };
}
