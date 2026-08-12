export function ActionCard({
  label,
  icon,
  primary,
  onClick,
}: {
  label: string;
  icon: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card center"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: "20px 10px",
        background: primary ? "linear-gradient(100deg, var(--gold-l), var(--gold) 45%, var(--gold-d))" : undefined,
        borderColor: primary ? "transparent" : undefined,
        color: primary ? "#20170a" : undefined,
      }}
    >
      <span style={{ fontSize: 28 }}>{icon}</span>
      <b style={{ fontFamily: "var(--fd)", fontSize: 14 }}>{label}</b>
    </button>
  );
}
