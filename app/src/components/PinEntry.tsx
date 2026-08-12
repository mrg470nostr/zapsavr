import { useEffect, useState } from "react";
import { PinPad } from "./PinPad";

const LENGTH = 4;

export function PinEntry({
  onComplete,
  shake,
}: {
  onComplete: (pin: string) => void;
  shake?: boolean;
}) {
  const [digits, setDigits] = useState<string[]>([]);

  useEffect(() => {
    if (digits.length === LENGTH) {
      const pin = digits.join("");
      onComplete(pin);
      setDigits([]);
    }
  }, [digits, onComplete]);

  return (
    <div className="stack" style={{ alignItems: "center" }}>
      <div className="row" style={{ justifyContent: "center", gap: 14 }}>
        {Array.from({ length: LENGTH }).map((_, i) => (
          <span
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: i < digits.length ? "var(--gold)" : "transparent",
              border: "2px solid var(--line)",
              animation: shake ? "shake 0.3s" : undefined,
            }}
          />
        ))}
      </div>
      <div style={{ width: "100%", maxWidth: 260 }}>
        <PinPad
          onKey={(d) => setDigits((prev) => (prev.length < LENGTH ? [...prev, d] : prev))}
          onBackspace={() => setDigits((prev) => prev.slice(0, -1))}
        />
      </div>
    </div>
  );
}
