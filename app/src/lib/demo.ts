// Demo mode: lets someone click through the whole app with no real wallet,
// no NWC connection, and no KYC of any kind — purely local, fake numbers.
export const DEMO_URL = "demo://zapsavr";

const BALANCE_KEY = "zapsavr.demo.balanceSats";
const BUDGET_TOTAL_SATS = 20000;

function readBalance(): number {
  const raw = localStorage.getItem(BALANCE_KEY);
  return raw !== null ? parseInt(raw, 10) : 8000;
}

function writeBalance(sats: number) {
  localStorage.setItem(BALANCE_KEY, String(Math.max(0, sats)));
}

export function resetDemo() {
  localStorage.removeItem(BALANCE_KEY);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function demoGetBalanceSats(): Promise<number> {
  await wait(300);
  return readBalance();
}

export async function demoGetBudget() {
  await wait(300);
  const balance = readBalance();
  const used = Math.max(0, BUDGET_TOTAL_SATS - balance);
  return { used_budget: used * 1000, total_budget: BUDGET_TOTAL_SATS * 1000 };
}

export async function demoMakeInvoice(amountSats: number, description: string) {
  await wait(400);
  // No second device to actually pay it in a solo demo — credit instantly
  // so the jar visibly fills, same as the real "someone paid it" moment would.
  writeBalance(readBalance() + amountSats);
  return {
    invoice: `lnbc-demo-${amountSats}-${Math.random().toString(36).slice(2, 10)}`,
    description,
  };
}

export async function demoPayInvoice(invoice: string) {
  await wait(500);
  const balance = readBalance();
  // Fake spend amount: a small, plausible "snack at a market stall" size,
  // unless the pasted text itself hints at an amount.
  const hinted = invoice.match(/(\d{2,6})/);
  const amount = hinted ? Math.min(parseInt(hinted[1], 10), balance) : Math.min(1500, balance);
  if (amount <= 0 || amount > balance) {
    throw new Error("Not enough in the demo balance for that.");
  }
  writeBalance(balance - amount);
  return { preimage: "demo", fees_paid: 0, amount };
}
