import { useState } from "react";
import { QrScan } from "./QrScan";
import { payInvoice } from "../lib/nwc";

export function SendPanel({
  nwcUrl,
  failMessage = "That payment didn't go through — check the request or your allowance.",
  onClose,
}: {
  nwcUrl: string;
  failMessage?: string;
  onClose: () => void;
}) {
  const [invoice, setInvoice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handlePay() {
    setLoading(true);
    setError("");
    try {
      await payInvoice(nwcUrl, invoice);
      setSuccess(true);
    } catch {
      setError(failMessage);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="card stack">
      <h3>Pay</h3>
      <div className="field">
        <label>Payment request</label>
        <QrScan onScan={setInvoice} />
        <textarea
          placeholder="Paste or scan the payment request"
          value={invoice}
          onChange={(e) => setInvoice(e.target.value)}
          rows={4}
          style={{ marginTop: 8 }}
        />
      </div>
      {error && <p className="small" style={{ color: "var(--err)" }}>{error}</p>}
      <button className="btn" onClick={handlePay} disabled={!invoice || loading}>
        {loading ? "Paying…" : "Pay"}
      </button>
      <button className="btn ghost sm" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}
