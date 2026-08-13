import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { makeInvoice } from "../lib/nwc";
import { CopyField } from "./CopyField";

export function ReceivePanel({
  nwcUrl,
  title = "Ask for sats",
  description = "ZapSavr top-up",
  onClose,
}: {
  nwcUrl: string;
  title?: string;
  description?: string;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [invoice, setInvoice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    const sats = parseInt(amount, 10);
    if (!sats || sats <= 0) return;
    setLoading(true);
    setError("");
    try {
      const tx = await makeInvoice(nwcUrl, sats, description);
      setInvoice(tx.invoice);
    } catch {
      setError("Couldn't create a payment request. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card stack">
      <h3>{title}</h3>
      {invoice ? (
        <>
          <p className="small">Show this to whoever's sending sats.</p>
          <div className="qr-wrap" role="img" aria-label="QR code for the payment request">
            <QRCodeSVG value={invoice} size={180} />
          </div>
          <details>
            <summary className="small">Can't scan? Use the request directly</summary>
            <CopyField label="Payment request" value={invoice} />
          </details>
        </>
      ) : (
        <>
          <div className="field">
            <label htmlFor="receive-amount">How many sats?</label>
            <input
              id="receive-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 2000"
            />
          </div>
          {error && <p className="small" style={{ color: "var(--err)" }}>{error}</p>}
          <button className="btn" onClick={handleCreate} disabled={!amount || loading}>
            {loading ? "Creating…" : "Create request"}
          </button>
        </>
      )}
      <button className="btn ghost sm" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
