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

export type ParentState = {
  role: "parent";
  nwcUrl: string;
  kidNickname: string;
  pin?: string;
};

type AppState = KidState | ParentState;

const KEY = "zapsavr.state.v1";

export function loadState(): AppState | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppState;
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
