export type Role = "parent" | "kid";

// A goal is a labeled portion of the kid's one real balance, not a separate
// account — allocatedSats is local bookkeeping, moving it between goals
// never touches the network. See docs/ARCHITECTURE.md "Saving spaces".
export type SavingTarget = {
  id: string;
  name: string;
  goalSats: number;
  allocatedSats: number;
};

export type KidState = {
  role: "kid";
  nickname: string;
  nwcUrl: string;
  targets: SavingTarget[];
  // A kid-set-for-themselves nudge, not a parent-enforced limit — there's no
  // channel today for a parent's device to push a setting to the kid's
  // device. See docs/ARCHITECTURE.md "Pause before a big purchase".
  bigPurchasePauseSats?: number;
};

export type FamilyKid = {
  id: string;
  nickname: string;
  nwcUrl: string;
};

export type OwnWallet = {
  nwcUrl: string;
};

export type ParentState = {
  role: "parent";
  pin?: string;
  kids: FamilyKid[];
  ownWallet?: OwnWallet;
  // Experimental, opt-in, entirely separate from ownWallet above (which
  // connects to a wallet elsewhere via NWC). This one flags that ZapSavr
  // itself is holding a seed — see docs/ARCHITECTURE.md "Embedded hot
  // wallet". The encrypted seed itself lives in its own storage key
  // (lib/hotwallet.ts), never here, so this state can be freely inspected
  // without ever containing key material.
  hotWalletNetwork?: "mainnet" | "regtest";
};

type AppState = KidState | ParentState;

const KEY = "zapsavr.state.v1";

// Oldest shape had a single `target: SavingTarget | null` (no id/allocatedSats).
type LegacyKidState = {
  role: "kid";
  nickname: string;
  nwcUrl: string;
  target: { name: string; goalSats: number } | null;
};

function isLegacyKidState(state: unknown): state is LegacyKidState {
  const s = state as { role?: string; targets?: unknown; target?: unknown };
  return s?.role === "kid" && !Array.isArray(s.targets) && "target" in s;
}

export function loadState(): AppState | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Older single-kid parent shape isn't compatible with the family model — treat as absent.
    if (parsed.role === "parent" && !Array.isArray(parsed.kids)) return null;
    if (isLegacyKidState(parsed)) {
      const migrated: KidState = {
        role: "kid",
        nickname: parsed.nickname,
        nwcUrl: parsed.nwcUrl,
        targets: parsed.target
          ? [{ id: newId(), name: parsed.target.name, goalSats: parsed.target.goalSats, allocatedSats: 0 }]
          : [],
      };
      return migrated;
    }
    return parsed as AppState;
  } catch {
    return null;
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function clearState() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(UNLOCK_KEY);
  clearPinAttempts();
}

const UNLOCK_KEY = "zapsavr.parentUnlocked";

export function isParentUnlocked(): boolean {
  return sessionStorage.getItem(UNLOCK_KEY) === "1";
}

export function setParentUnlocked() {
  sessionStorage.setItem(UNLOCK_KEY, "1");
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Kept for existing call sites.
export const newKidId = newId;

// ---------- PIN attempt limiting ----------
//
// A soft lockout, not a permanent one: the delay always ends on its own, so
// a parent can never be permanently locked out of their own funds by this
// alone (that would be worse than the brute-force risk it's guarding
// against). Persisted in localStorage, not sessionStorage, so closing and
// reopening the tab doesn't reset the counter — see docs/SECURITY.md.

const PIN_ATTEMPTS_KEY = "zapsavr.pinAttempts.v1";

type PinAttemptState = { count: number; lockedUntil: number };

function loadPinAttemptState(): PinAttemptState {
  try {
    const raw = localStorage.getItem(PIN_ATTEMPTS_KEY);
    if (!raw) return { count: 0, lockedUntil: 0 };
    return JSON.parse(raw) as PinAttemptState;
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function delayForAttemptMs(count: number): number {
  if (count < 4) return 0;
  if (count < 7) return 10_000;
  if (count < 10) return 30_000;
  return 60_000;
}

// Returns the timestamp (ms) the lockout lasts until, so the caller can show a countdown.
export function recordFailedPinAttempt(): number {
  const prev = loadPinAttemptState();
  const count = prev.count + 1;
  const lockedUntil = Date.now() + delayForAttemptMs(count);
  localStorage.setItem(PIN_ATTEMPTS_KEY, JSON.stringify({ count, lockedUntil }));
  return lockedUntil;
}

export function pinLockedUntil(): number {
  return loadPinAttemptState().lockedUntil;
}

export function clearPinAttempts() {
  localStorage.removeItem(PIN_ATTEMPTS_KEY);
}
