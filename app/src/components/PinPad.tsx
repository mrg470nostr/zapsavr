const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

export function PinPad({
  onKey,
  onBackspace,
}: {
  onKey: (digit: string) => void;
  onBackspace: () => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 10,
      }}
    >
      {KEYS.map((key, i) =>
        key === "" ? (
          <div key={i} />
        ) : (
          <button
            key={i}
            className="card"
            style={{ padding: "18px 0", fontFamily: "var(--fd)", fontWeight: 800, fontSize: 20 }}
            onClick={() => (key === "back" ? onBackspace() : onKey(key))}
          >
            {key === "back" ? "⌫" : key}
          </button>
        )
      )}
    </div>
  );
}
