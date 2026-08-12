import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Hud } from "../components/Hud";
import { PinEntry } from "../components/PinEntry";
import { isValidNwcUrl, getBalanceSats, getBudget, DEMO_URL } from "../lib/nwc";
import { resetDemo } from "../lib/demo";
import {
  loadState,
  saveState,
  clearState,
  isParentUnlocked,
  setParentUnlocked,
  type ParentState,
} from "../lib/storage";

type Step = "connect" | "pair" | "pin-setup" | "locked" | "home";

function initialStep(existing: ReturnType<typeof loadState>): Step {
  if (existing?.role !== "parent") return "connect";
  if (existing.pin && !isParentUnlocked()) return "locked";
  return "home";
}

export function ParentFlow() {
  const navigate = useNavigate();
  const existing = loadState();
  const [step, setStep] = useState<Step>(initialStep(existing));
  const [nwcUrl, setNwcUrl] = useState(existing?.role === "parent" ? existing.nwcUrl : "");
  const [kidNickname, setKidNickname] = useState(
    existing?.role === "parent" ? existing.kidNickname : ""
  );
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [pinDraft, setPinDraft] = useState<string | null>(null);
  const [pinError, setPinError] = useState("");
  const [pinShake, setPinShake] = useState(false);

  async function handleConnect(urlOverride?: string) {
    const url = urlOverride ?? nwcUrl;
    setError("");
    if (!isValidNwcUrl(url)) {
      setError("That doesn't look like a wallet connection string. It should start with nostr+walletconnect://");
      return;
    }
    setChecking(true);
    try {
      await getBalanceSats(url);
      if (urlOverride) setNwcUrl(urlOverride);
      setStep("pair");
    } catch {
      setError("Couldn't reach that wallet connection. Double check it's still active.");
    } finally {
      setChecking(false);
    }
  }

  function handleTryDemo() {
    handleConnect(DEMO_URL);
  }

  function handleConfirmPairing() {
    setStep("pin-setup");
  }

  function handlePinSetupEntry(pin: string) {
    if (pinDraft === null) {
      setPinDraft(pin);
      setPinError("");
      return;
    }
    if (pin === pinDraft) {
      const state: ParentState = { role: "parent", nwcUrl, kidNickname: kidNickname || "your kid", pin };
      saveState(state);
      setParentUnlocked();
      setStep("home");
    } else {
      setPinError("Those didn't match — try again.");
      setPinDraft(null);
    }
  }

  function handleUnlockEntry(pin: string) {
    if (existing?.role === "parent" && pin === existing.pin) {
      setParentUnlocked();
      setStep("home");
    } else {
      setPinShake(true);
      setPinError("Wrong PIN, try again.");
      setTimeout(() => setPinShake(false), 300);
    }
  }

  function handleDisconnect() {
    if (nwcUrl === DEMO_URL) resetDemo();
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
            <button className="btn" onClick={() => handleConnect()} disabled={!nwcUrl || checking}>
              {checking ? "Checking…" : "Connect"}
            </button>
            <button className="btn ghost sm" onClick={handleTryDemo} disabled={checking}>
              🧪 Try a demo (no wallet needed)
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
            <p className="lede">
              {nwcUrl === DEMO_URL
                ? "This is a demo, so there's no real code to scan. On the kid's device, just tap \"Try a demo\" on its own pairing screen."
                : "Open ZapSavr on their phone and scan this to connect their jar."}
            </p>
          </div>
          {nwcUrl !== DEMO_URL && (
            <div className="qr-wrap">
              <QRCodeSVG value={nwcUrl} size={220} />
            </div>
          )}
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

  if (step === "pin-setup") {
    return (
      <div className="wrap">
        <Hud />
        <div className="screen">
          <div className="stack center">
            <h2>{pinDraft === null ? "Set a PIN" : "Confirm your PIN"}</h2>
            <p className="lede">
              {pinDraft === null
                ? "This keeps the allowance and disconnect controls to you."
                : "Enter it again to confirm."}
            </p>
          </div>
          {pinError && (
            <p className="small center" style={{ color: "var(--err)" }}>
              {pinError}
            </p>
          )}
          <PinEntry onComplete={handlePinSetupEntry} />
        </div>
      </div>
    );
  }

  if (step === "locked") {
    return (
      <div className="wrap">
        <Hud />
        <div className="screen">
          <div className="stack center">
            <h2>Enter your PIN</h2>
            <p className="lede">Protecting {existing?.role === "parent" ? existing.kidNickname : ""}'s allowance controls.</p>
          </div>
          {pinError && (
            <p className="small center" style={{ color: "var(--err)" }}>
              {pinError}
            </p>
          )}
          <PinEntry onComplete={handleUnlockEntry} shake={pinShake} />
          <div className="spacer" />
          <button className="btn ghost sm" onClick={handleDisconnect}>
            Forgot it? Disconnect and set up again
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
      <Hud
        right={
          <>
            {nwcUrl === DEMO_URL && <span className="chip">DEMO</span>}
            <span className={`chip ${status === "ok" ? "ok" : status === "error" ? "err" : ""}`}>
              {status === "ok" ? "Connected" : status === "error" ? "Unreachable" : "Checking…"}
            </span>
          </>
        }
      />
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
