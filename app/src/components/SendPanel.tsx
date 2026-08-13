import { useId, useState } from "react";
import { QrScan } from "./QrScan";
import { payInvoice, previewInvoiceAmountSats } from "../lib/nwc";

export function SendPanel({
  nwcUrl,
  failMessage = "That payment didn't go through — check the request or your allowance.",
  onClose,
  onPaid,
  confirmAboveSats,
}: {
  nwcUrl: string;
  failMessage?: string;
  onClose: () => void;
  onPaid?: (amountSats: number | null) => void;
  /** A kid-set-for-themselves "pause and think" nudge, not an enforced limit — see SendPanel usage sites. */
  confirmAboveSats?: number;
}) {
  const invoiceFieldId = useId();
  const [invoice, setInvoice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);

  async function submitPayment() {
    setLoading(true);
    setError("");
    try {
      const result = await payInvoice(nwcUrl, invoice);
      setSuccess(true);
      onPaid?.(result.amountSats);
    } catch {
      setError(failMessage);
    } finally {
      setLoading(false);
    }
  }

  function handlePayClick() {
    if (confirmAboveSats) {
      const amount = previewInvoiceAmountSats(nwcUrl, invoice);
      if (amount !== null && amount > confirmAboveSats) {
        setPendingAmount(amount);
        return;
      }
    }
    submitPayment();
  }

  if (success) {
    return (
      <div className="card stack center">
        <span style={{ fontSize: 32 }}>✅</span>
        <b>Paid!</b>
        <button className="btn ghost sm" onClick={onClose}>
          Done
        </button>
      </div>
    );
  }

  if (pendingAmount !== null) {
    return (
      <div className="card stack center">
        <span style={{ fontSize: 28 }}>✋</span>
        <b>That's a big one</b>
        <p className="small">
          {pendingAmount.toLocaleString()} sats is more than your {confirmAboveSats?.toLocaleString()} sat pause
          amount. Still want to pay it?
        </p>
        <div className="row" style={{ width: "100%" }}>
          <button className="btn" style={{ flex: 1 }} onClick={submitPayment} disabled={loading}>
            {loading ? "Paying…" : "Yes, pay"}
          </button>
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setPendingAmount(null)}>
            Wait, let me think
          </button>
        </div>
        {error && <p className="small" style={{ color: "var(--err)" }}>{error}</p>}
      </div>
    );
  }

  return (
    <div className="card stack">
      <h3>Pay</h3>
      <div className="field">
        <label htmlFor={invoiceFieldId}>Payment request</label>
        <QrScan onScan={setInvoice} />
        <textarea
          id={invoiceFieldId}
          placeholder="Paste or scan the payment request"
          value={invoice}
          onChange={(e) => setInvoice(e.target.value)}
          rows={4}
          style={{ marginTop: 8 }}
        />
      </div>
      {error && <p className="small" style={{ color: "var(--err)" }}>{error}</p>}
      <button className="btn" onClick={handlePayClick} disabled={!invoice || loading}>
        {loading ? "Paying…" : "Pay"}
      </button>
      <button className="btn ghost sm" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}
