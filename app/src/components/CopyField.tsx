import { useId, useState } from "react";

// A text alternative to a QR code: visible, selectable, and copyable, for
// anyone who can't scan (no camera, screen reader, printed instructions).
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const id = useId();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (older browsers, no permission) —
      // the text is already selectable by hand, so this isn't a dead end.
    }
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} readOnly value={value} rows={3} onFocus={(e) => e.target.select()} />
      <button type="button" className="btn ghost sm" style={{ marginTop: 8 }} onClick={handleCopy}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
