import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Hud } from "../components/Hud";
import { isValidNwcUrl, getBalanceSats, getBudget } from "../lib/nwc";
import { loadState, saveState, clearState, type ParentState } from "../lib/storage";

type Step = "connect" | "pair" | "home";

export function ParentFlow() {
  const navigate = useNavigate();
  const existing = loadState();
  const [step, setStep] = useState<Step>(
    existing?.role === "parent" ? "home" : "connect"
  );
  const [nwcUrl, setNwcUrl] = useState(existing?.role === "parent" ? existing.nwcUrl : "");
  const [kidNickname, setKidNickname] = useState(
    existing?.role === "parent" ? existing.kidNickname : ""
  );
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function handleConnect() {
    setError("");
    if (!isValidNwcUrl(nwcUrl)) {
      setError("That doesn't look like a wallet connection string. It should start with nostr+walletconnect://");
      return;
    }
    setChecking(true);
    try {
      await getBalanceSats(nwcUrl);
      setStep("pair");
    } catch {
      setError("Couldn't reach that wallet connection. Double check it's still active.");
    } finally {
      setChecking(false);
    }
  }

  function handleConfirmPairing() {
    const state: ParentState = { role: "parent", nwcUrl, kidNickname: kidNickname || "your kid" };
    saveState(state);
    setStep("home");
  }

  function handleDisconnect() {
    clearState();
    navigate("/");
  }

  if (step === "connect") {
    return (
      <div className="wrap">
        <Hud onBack={() => navigate("/")} />
        <div className="screen">
          <div className="stack">
            <h2>Connect your wallet</h2>
            <p className="lede">
              This is where your money actually lives — ZapSavr just gets permission to use a little of it.
            </p>
          </div>
          <div className="card stack">
            <div className="field">
              <label>Connection string from your wallet</label>
              <textarea
                placeholder="nostr+walletconnect://..."
                value={nwcUrl}
                onChange={(e) => setNwcUrl(e.target.value)}
                rows={4}
              />
            </div>
            <p className="small">
              In your NWC-capable wallet (Alby Hub is a good default), create a new connection with a weekly
              budget, then paste the connection string it gives you here.
            </p>
            {error && <p className="small" style={{ color: "var(--err)" }}>{error}</p>}
            <button className="btn" onClick={handleConnect} disabled={!nwcUrl || checking}>
              {checking ? "Checking…" : "Connect"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "pair") {
    return (
      <div className="wrap">
        <Hud onBack={() => setStep("connect")} />
        <div className="screen">
          <div className="stack">
            <h2>Connect to your kid</h2>
            <p className="lede">Open ZapSavr on their phone and scan this to connect their jar.</p>
          </div>
          <div className="qr-wrap">
            <QRCodeSVG value={nwcUrl} size={220} />
          </div>
          <div className="card stack">
            <div className="field">
              <label>Kid's nickname (just for your view)</label>
              <input
                type="text"
                placeholder="e.g. Leo"
                value={kidNickname}
                onChange={(e) => setKidNickname(e.target.value)}
              />
            </div>
          </div>
          <button className="btn" onClick={handleConfirmPairing}>
            They've scanned it
          </button>
        </div>
      </div>
    );
  }

  return <ParentHome nwcUrl={nwcUrl} kidNickname={kidNickname} onDisconnect={handleDisconnect} />;
}

function ParentHome({
  nwcUrl,
  kidNickname,
  onDisconnect,
}: {
  nwcUrl: string;
  kidNickname: string;
  onDisconnect: () => void;
}) {
  const [balance, setBalance] = useState<number | null>(null);
  const [budget, setBudget] = useState<{ used: number; total: number } | null>(null);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const sats = await getBalanceSats(nwcUrl);
        const b = await getBudget(nwcUrl);
        if (cancelled) return;
        setBalance(sats);
        if ("total_budget" in b) {
          setBudget({ used: b.used_budget, total: b.total_budget });
        }
        setStatus("ok");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [nwcUrl]);

  return (
    <div className="wrap">
      <Hud right={<span className={`chip ${status === "ok" ? "ok" : status === "error" ? "err" : ""}`}>
        {status === "ok" ? "Connected" : status === "error" ? "Unreachable" : "Checking…"}
      </span>} />
      <div className="screen">
        <h2>{kidNickname}'s jar</h2>

        <div className="card stack">
          <span className="small">CURRENT BALANCE</span>
          {balance === null ? (
            <p className="small">{status === "error" ? "Can't check right now" : "Loading…"}</p>
          ) : (
            <span className="jar-amount gold">{balance.toLocaleString()} sats</span>
          )}
        </div>

        {budget && (
          <div className="card stack">
            <span className="small">ALLOWANCE USED THIS PERIOD</span>
            <div className="track">
              <i style={{ width: `${Math.min(100, (budget.used / Math.max(budget.total, 1)) * 100)}%` }} />
            </div>
            <span className="small">
              {Math.floor(budget.used / 1000).toLocaleString()} / {Math.floor(budget.total / 1000).toLocaleString()} sats
            </span>
          </div>
        )}

        {status === "error" && (
          <div className="stub">
            Couldn't reach the wallet connection right now. If you meant to disconnect, that's fine — otherwise
            check your wallet app is online.
          </div>
        )}

        <div className="spacer" />

        {confirmingDisconnect ? (
          <div className="card stack">
            <p className="small">
              This clears {kidNickname}'s connection on this device. To fully revoke it, also delete the
              connection from your wallet app — that's what actually cuts off spending.
            </p>
            <div className="row">
              <button className="btn danger" onClick={onDisconnect} style={{ flex: 1 }}>
                Disconnect
              </button>
              <button className="btn ghost" onClick={() => setConfirmingDisconnect(false)} style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="btn danger" onClick={() => setConfirmingDisconnect(true)}>
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}
