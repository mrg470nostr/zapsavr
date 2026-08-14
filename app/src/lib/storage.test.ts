import { describe, it, expect, beforeEach } from "vitest";
import {
  loadState,
  saveState,
  clearState,
  isParentUnlocked,
  setParentUnlocked,
  newId,
  recordFailedPinAttempt,
  pinLockedUntil,
  clearPinAttempts,
  type ParentState,
  type KidState,
} from "./storage";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("saveState / loadState round-trip", () => {
  it("persists and reloads a kid state", () => {
    const state: KidState = {
      role: "kid",
      nickname: "Leo",
      nwcUrl: "demo://zapsavr/leo",
      targets: [{ id: "g1", name: "Skateboard", goalSats: 20000, allocatedSats: 5000 }],
    };
    saveState(state);
    expect(loadState()).toEqual(state);
  });

  it("persists and reloads a parent state with kids and a pin", () => {
    const state: ParentState = {
      role: "parent",
      pin: "1234",
      kids: [{ id: "k1", nickname: "Leo", nwcUrl: "demo://zapsavr/leo" }],
      ownWallet: { nwcUrl: "demo://zapsavr/parent-own" },
    };
    saveState(state);
    expect(loadState()).toEqual(state);
  });

  it("returns null when nothing is stored", () => {
    expect(loadState()).toBeNull();
  });

  it("returns null for corrupted JSON rather than throwing", () => {
    localStorage.setItem("zapsavr.state.v1", "{not json");
    expect(loadState()).toBeNull();
  });
});

describe("legacy shape migration", () => {
  it("migrates an old single-target kid state into the targets array", () => {
    localStorage.setItem(
      "zapsavr.state.v1",
      JSON.stringify({
        role: "kid",
        nickname: "Leo",
        nwcUrl: "demo://zapsavr/leo",
        target: { name: "Skateboard", goalSats: 20000 },
      })
    );
    const loaded = loadState();
    expect(loaded?.role).toBe("kid");
    if (loaded?.role !== "kid") throw new Error("expected kid state");
    expect(loaded.targets).toHaveLength(1);
    expect(loaded.targets[0]).toMatchObject({ name: "Skateboard", goalSats: 20000, allocatedSats: 0 });
    expect(loaded.targets[0].id).toBeTruthy();
  });

  it("migrates a legacy kid state with no target into an empty targets array", () => {
    localStorage.setItem(
      "zapsavr.state.v1",
      JSON.stringify({ role: "kid", nickname: "Leo", nwcUrl: "demo://zapsavr/leo", target: null })
    );
    const loaded = loadState();
    if (loaded?.role !== "kid") throw new Error("expected kid state");
    expect(loaded.targets).toEqual([]);
  });

  it("treats an old single-kid parent shape (no kids array) as absent, not a crash", () => {
    localStorage.setItem(
      "zapsavr.state.v1",
      JSON.stringify({ role: "parent", nwcUrl: "demo://zapsavr/old", kidNickname: "Leo" })
    );
    expect(loadState()).toBeNull();
  });
});

describe("parent session unlock — the local access-control gate", () => {
  it("starts locked (unlocked defaults to false)", () => {
    expect(isParentUnlocked()).toBe(false);
  });

  it("unlocks only after setParentUnlocked is called", () => {
    expect(isParentUnlocked()).toBe(false);
    setParentUnlocked();
    expect(isParentUnlocked()).toBe(true);
  });

  it("clearState revokes the unlocked session, not just the family data — the single most important local safety property", () => {
    saveState({ role: "parent", pin: "1234", kids: [] });
    setParentUnlocked();
    expect(isParentUnlocked()).toBe(true);

    clearState();

    expect(isParentUnlocked()).toBe(false);
    expect(loadState()).toBeNull();
  });
});

describe("PIN attempt limiting — a soft lockout, never a permanent one", () => {
  it("does not lock out the first few wrong attempts", () => {
    for (let i = 0; i < 3; i++) recordFailedPinAttempt();
    expect(pinLockedUntil()).toBeLessThanOrEqual(Date.now());
  });

  it("introduces a growing delay after repeated wrong attempts", () => {
    for (let i = 0; i < 3; i++) recordFailedPinAttempt();
    const untilAfter4 = recordFailedPinAttempt();
    expect(untilAfter4).toBeGreaterThan(Date.now());

    for (let i = 0; i < 2; i++) recordFailedPinAttempt();
    const untilAfter7 = recordFailedPinAttempt();
    expect(untilAfter7 - Date.now()).toBeGreaterThan(untilAfter4 - Date.now());
  });

  it("the delay always ends — never grows into a permanent lock", () => {
    for (let i = 0; i < 20; i++) recordFailedPinAttempt();
    const until = pinLockedUntil();
    expect(until - Date.now()).toBeLessThanOrEqual(60_000);
  });

  it("clearPinAttempts resets the counter and any active lock", () => {
    for (let i = 0; i < 10; i++) recordFailedPinAttempt();
    expect(pinLockedUntil()).toBeGreaterThan(Date.now());

    clearPinAttempts();

    expect(pinLockedUntil()).toBe(0);
  });

  it("a successful unlock (clearState) also resets the attempt counter", () => {
    saveState({ role: "parent", pin: "1234", kids: [] });
    for (let i = 0; i < 10; i++) recordFailedPinAttempt();
    expect(pinLockedUntil()).toBeGreaterThan(Date.now());

    clearState();

    expect(pinLockedUntil()).toBe(0);
  });
});

describe("newId", () => {
  it("produces non-empty, distinct ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => newId()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id.length).toBeGreaterThan(0);
  });
});
