import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PinEntry } from "./PinEntry";

describe("PinEntry", () => {
  it("only calls onComplete once all 4 digits are entered", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<PinEntry onComplete={onComplete} />);

    await user.click(screen.getByText("1"));
    await user.click(screen.getByText("2"));
    await user.click(screen.getByText("3"));
    expect(onComplete).not.toHaveBeenCalled();

    await user.click(screen.getByText("4"));
    expect(onComplete).toHaveBeenCalledWith("1234");
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("backspace removes the last digit before completion", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<PinEntry onComplete={onComplete} />);

    await user.click(screen.getByText("9"));
    await user.click(screen.getByText("9"));
    await user.click(screen.getByText("⌫"));
    await user.click(screen.getByText("1"));
    await user.click(screen.getByText("2"));
    await user.click(screen.getByText("3"));

    expect(onComplete).toHaveBeenCalledWith("9123");
  });

  it("resets after completing, ready for a fresh attempt", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<PinEntry onComplete={onComplete} />);

    for (const d of ["1", "1", "1", "1"]) await user.click(screen.getByText(d));
    expect(onComplete).toHaveBeenCalledTimes(1);

    for (const d of ["2", "2", "2", "2"]) await user.click(screen.getByText(d));
    expect(onComplete).toHaveBeenCalledTimes(2);
    expect(onComplete).toHaveBeenLastCalledWith("2222");
  });
});
