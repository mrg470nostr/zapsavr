import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export function Hud({
  right,
  onBack,
}: {
  right?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <div className="hud">
      {onBack && (
        <button className="iconbtn" onClick={onBack} aria-label="Back">
          ←
        </button>
      )}
      <Logo size={22} />
      <span className="brand">ZAPSAVR</span>
      <div className="sp" />
      {right}
      <ThemeToggle />
    </div>
  );
}
