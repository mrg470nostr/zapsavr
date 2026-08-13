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
