export type Role = "parent" | "kid";

export type SavingTarget = {
  name: string;
  goalSats: number;
};

export type KidState = {
  role: "kid";
  nickname: string;
  nwcUrl: string;
  target: SavingTarget | null;
};

export type FamilyKid = {
  id: string;
  nickname: string;
  nwcUrl: string;
};

export type ParentState = {
  role: "parent";
  pin?: string;
  kids: FamilyKid[];
};

type AppState = KidState | ParentState;

const KEY = "zapsavr.state.v1";

export function loadState(): AppState | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppState;
    // Older single-kid shape isn't compatible with the family model — treat as absent.
    if (parsed.role === "parent" && !Array.isArray(parsed.kids)) return null;
    return parsed;
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

export function newKidId(): string {
  return Math.random().toString(36).slice(2, 10);
}
