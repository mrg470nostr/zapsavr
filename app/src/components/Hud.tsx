import type { ReactNode } from "react";

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
      <span className="brand">ZAPSAVR</span>
      <div className="sp" />
      {right}
    </div>
  );
}
