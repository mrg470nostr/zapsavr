import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ParentFlow } from "./ParentFlow";
import { saveState, isParentUnlocked, type ParentState } from "../lib/storage";
import { getBalanceSats, getBudget, listTransactions } from "../lib/nwc";

vi.mock("../lib/nwc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/nwc")>();
  return {
    ...actual,
    getBalanceSats: vi.fn(),
    getBudget: vi.fn(),
    listTransactions: vi.fn(),
  };
});

function seedLockedFamily() {
  const state: ParentState = {
    role: "parent",
    pin: "1234",
    kids: [{ id: "k1", nickname: "Leo", nwcUrl: "demo://zapsavr/leo" }],
  };
  saveState(state);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.mocked(getBalanceSats).mockResolvedValue(8000);
  vi.mocked(getBudget).mockResolvedValue({ used_budget: 0, total_budget: 20000000 });
  vi.mocked(listTransactions).mockResolvedValue([]);
});

async function enterPin(user: ReturnType<typeof userEvent.setup>, pin: string) {
  for (const digit of pin) {
    await user.click(screen.getByText(digit));
  }
}

describe("ParentFlow PIN gate — the local access-control property this codebase owns", () => {
  it("shows the lock screen, not the family dashboard, for a family with a pin set", () => {
    seedLockedFamily();
    render(
      <MemoryRouter initialEntries={["/parent"]}>
        <ParentFlow />
      </MemoryRouter>
    );
    expect(screen.getByText("Enter your PIN")).toBeInTheDocument();
    expect(screen.queryByText("Leo")).not.toBeInTheDocument();
  });

  it("a wrong PIN does not unlock — no family data is revealed", async () => {
    seedLockedFamily();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/parent"]}>
        <ParentFlow />
      </MemoryRouter>
    );

    await enterPin(user, "0000");

    expect(await screen.findByText(/wrong pin/i)).toBeInTheDocument();
    expect(screen.queryByText("Leo")).not.toBeInTheDocument();
    expect(isParentUnlocked()).toBe(false);
  });

  it("the correct PIN unlocks the family dashboard", async () => {
    seedLockedFamily();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/parent"]}>
        <ParentFlow />
      </MemoryRouter>
    );

    await enterPin(user, "1234");

    await waitFor(() => expect(screen.getByText("Leo")).toBeInTheDocument());
    expect(isParentUnlocked()).toBe(true);
  });

  it("a family with no pin set at all goes straight to the dashboard (nothing to unlock)", async () => {
    saveState({ role: "parent", kids: [{ id: "k1", nickname: "Mia", nwcUrl: "demo://zapsavr/mia" }] });
    render(
      <MemoryRouter initialEntries={["/parent"]}>
        <ParentFlow />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText("Mia")).toBeInTheDocument());
  });
});
