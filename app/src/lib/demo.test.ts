import { describe, it, expect, beforeEach } from "vitest";
import {
  isDemoUrl,
  demoUrlFor,
  resetDemo,
  demoGetBalanceSats,
  demoMakeInvoice,
  demoPayInvoice,
  demoListTransactions,
} from "./demo";

beforeEach(() => {
  localStorage.clear();
});

describe("isDemoUrl / demoUrlFor", () => {
  it("recognizes demo urls and rejects real ones", () => {
    expect(isDemoUrl(demoUrlFor("leo"))).toBe(true);
    expect(isDemoUrl("nostr+walletconnect://abc")).toBe(false);
  });

  it("keys are isolated per label", () => {
    expect(demoUrlFor("leo")).not.toBe(demoUrlFor("mia"));
  });
});

describe("demo balance and top-up", () => {
  it("starts at a default balance for a fresh url", async () => {
    const url = demoUrlFor(`fresh-${Math.random()}`);
    expect(await demoGetBalanceSats(url)).toBe(8000);
  });

  it("making an invoice credits the balance and logs an incoming tx", async () => {
    const url = demoUrlFor(`credit-${Math.random()}`);
    const before = await demoGetBalanceSats(url);
    await demoMakeInvoice(url, 3000, "Allowance top-up");
    expect(await demoGetBalanceSats(url)).toBe(before + 3000);

    const tx = await demoListTransactions(url);
    expect(tx[0]).toMatchObject({ type: "incoming", amountSats: 3000, description: "Allowance top-up" });
  });

  it("different demo kids never share balance state", async () => {
    const leo = demoUrlFor(`leo-${Math.random()}`);
    const mia = demoUrlFor(`mia-${Math.random()}`);
    await demoMakeInvoice(leo, 5000, "gift");
    expect(await demoGetBalanceSats(leo)).toBe(13000);
    expect(await demoGetBalanceSats(mia)).toBe(8000);
  });
});

describe("demo payments", () => {
  it("paying decreases the balance and logs an outgoing tx", async () => {
    const url = demoUrlFor(`spend-${Math.random()}`);
    await demoPayInvoice(url, "lnbc1500ndemoinvoice");
    expect(await demoGetBalanceSats(url)).toBe(8000 - 1500);
    const tx = await demoListTransactions(url);
    expect(tx[0]).toMatchObject({ type: "outgoing", amountSats: 1500 });
  });

  it("refuses to pay more than the current balance — no phantom overdraft", async () => {
    const url = demoUrlFor(`overdraft-${Math.random()}`);
    await expect(demoPayInvoice(url, "lnbc999999ndemoinvoice")).rejects.toThrow();
    // Balance must be unchanged after a rejected payment.
    expect(await demoGetBalanceSats(url)).toBe(8000);
  });
});

describe("resetDemo", () => {
  it("clears balance and history back to defaults", async () => {
    const url = demoUrlFor(`reset-${Math.random()}`);
    await demoMakeInvoice(url, 2000, "top-up");
    expect(await demoGetBalanceSats(url)).toBe(10000);

    resetDemo(url);

    expect(await demoGetBalanceSats(url)).toBe(8000);
    expect(await demoListTransactions(url)).toEqual([]);
  });
});
