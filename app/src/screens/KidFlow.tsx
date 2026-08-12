import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Hud } from "../components/Hud";
import { ActionCard } from "../components/ActionCard";
import { QrScan } from "../components/QrScan";
import { isValidNwcUrl, getBalanceSats, payInvoice, makeInvoice } from "../lib/nwc";
import { loadState, saveState, clearState, type KidState } from "../lib/storage";

type Step = "pair" | "goal" | "home";

export function KidFlow() {
  const navigate = useNavigate();
  const existing = loadState();
  const kidExisting = existing?.role === "kid" ? existing : null;

  const [step, setStep] = useState<Step>(
    kidExisting ? (kidExisting.target ? "home" : "goal") : "pair"
  );
  const [nwcUrl, setNwcUrl] = useState(kidExisting?.nwcUrl ?? "");
  const [nickname, setNickname] = useState(kidExisting?.nickname ?? "");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function handlePair() {
    setError("");
    if (!isValidNwcUrl(nwcUrl)) {
      setError("That doesn't look like a connection code. Ask a parent to show it again.");
      return;
    }
    setChecking(true);
    try {
      await getBalanceSats(nwcUrl);
      const state: KidState = { role: "kid", nickname: nickname || "friend", nwcUrl, target: null };
      saveState(state);
      setStep("goal");
    } catch {
      setError("Couldn't connect. Ask a parent to check their wallet app.");
    } finally {
      setChecking(false);
    }
  }

  function handleReset() {
    clearState();
    navigate("/");
  }

  if (step === "pair") {
    return (
      <div className="wrap">
        <Hud onBack={() => navigate("/")} />
        <div className="screen">
          <div className="stack">
            <h2>Connect to a parent</h2>
            <p className="lede">Ask a parent to open ZapSavr and show you a code, then scan it here.</p>
          </div>
          <div className="card stack">
            <div className="field">
              <label>Your name</label>
              <input type="text" placeholder="e.g. Leo" value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </div>
            <div className="field">
              <label>Scan or paste the code</label>
              <QrScan onScan={setNwcUrl} />
              <textarea
                placeholder="nostr+walletconnect://..."
                value={nwcUrl}
                onChange={(e) => setNwcUrl(e.target.value)}
                rows={4}
                style={{ marginTop: 8 }}
              />
            </div>
            {error && <p className="small" style={{ color: "var(--err)" }}>{error}</p>}
            <button className="btn" onClick={handlePair} disabled={!nwcUrl || checking}>
              {checking ? "Connecting…" : "Connect"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "goal") {
    return <GoalSetup nwcUrl={nwcUrl} nickname={nickname} onDone={() => setStep("home")} />;
  }

  return <KidHome nwcUrl={nwcUrl} nickname={nickname} onReset={handleReset} onEditGoal={() => setStep("goal")} />;
}

function GoalSetup({
  nwcUrl,
  nickname,
  onDone,
}: {
  nwcUrl: string;
  nickname: string;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");

  function handleSave() {
    const goalSats = parseInt(goal, 10);
    if (!name || !goalSats || goalSats <= 0) return;
    const state: KidState = { role: "kid", nickname, nwcUrl, target: { name, goalSats } };
    saveState(state);
    onDone();
  }

  return (
    <div className="wrap">
      <Hud />
      <div className="screen">
        <div className="stack">
          <h2>What are you saving for?</h2>
          <p className="lede">Pick something you want — this is the whole point.</p>
        </div>
        <div className="card stack">
          <div className="field">
            <label>What is it?</label>
            <input
              type="text"
              placeholder="e.g. New skateboard"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label>How many sats?</label>
            <input
              type="number"
              placeholder="e.g. 50000"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </div>
          <button className="btn" onClick={handleSave} disabled={!name || !goal}>
            Start saving
          </button>
        </div>
      </div>
    </div>
  );
}

function KidHome({
  nwcUrl,
  nickname,
  onReset,
  onEditGoal,
}: {
  nwcUrl: string;
  nickname: string;
  onReset: () => void;
  onEditGoal: () => void;
}) {
  const state = loadState();
  const target = state?.role === "kid" ? state.target : null;

  const [balance, setBalance] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [mode, setMode] = useState<"none" | "ask" | "pay" | "offline">("none");

  async function refreshBalance() {
    try {
      const sats = await getBalanceSats(nwcUrl);
      setBalance(sats);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    refreshBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nwcUrl]);

  const progress = target && balance !== null ? Math.min(100, (balance / target.goalSats) * 100) : 0;

  return (
    <div className="wrap">
      <Hud
        right={
          <span className={`chip ${status === "ok" ? "ok" : status === "error" ? "err" : ""}`}>
            {status === "ok" ? "Connected" : status === "error" ? "Unreachable" : "…"}
          </span>
        }
      />
      <div className="screen">
        <h2>Hi, {nickname}! 👋</h2>

        {target ? (
          <div className="card stack center">
            <span className="small">SAVING FOR</span>
            <b style={{ fontFamily: "var(--fd)", fontSize: 18 }}>{target.name}</b>
            {balance === null ? (
              <p className="small">{status === "error" ? "Can't check right now" : "Loading…"}</p>
            ) : (
              <span className="jar-amount gold">{balance.toLocaleString()} sats</span>
            )}
            <span className="jar-goal">of {target.goalSats.toLocaleString()} sats</span>
            <div className="track">
              <i style={{ width: `${progress}%` }} />
            </div>
            {progress >= 100 && <span className="chip ok">Goal reached! 🎉</span>}
            <button className="btn ghost sm" onClick={onEditGoal}>
              Change goal
            </button>
          </div>
        ) : null}

        <div className="row">
          <ActionCard label="Ask for sats" icon="📥" onClick={() => setMode("ask")} />
          <ActionCard label="Pay" icon="⚡" primary onClick={() => setMode("pay")} />
        </div>
        <div className="row">
          <ActionCard label="Offline payment" icon="📶" onClick={() => setMode("offline")} />
        </div>

        {mode === "ask" && <AskForSats nwcUrl={nwcUrl} onClose={() => { setMode("none"); refreshBalance(); }} />}
        {mode === "pay" && <PaySomeone nwcUrl={nwcUrl} onClose={() => { setMode("none"); refreshBalance(); }} />}
        {mode === "offline" && (
          <div className="stub">
            Offline, phone-to-phone payments are coming in a later version, once the community picks which Cashu
            mint (or Ark) to trust. For now, payments need an internet connection.
            <div style={{ marginTop: 10 }}>
              <button className="btn ghost sm" onClick={() => setMode("none")}>
                Close
              </button>
            </div>
          </div>
        )}

        <div className="spacer" />
        <button className="btn ghost sm" onClick={onReset}>
          Disconnect this device
        </button>
      </div>
    </div>
  );
}

function AskForSats({ nwcUrl, onClose }: { nwcUrl: string; onClose: () => void }) {
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
      const tx = await makeInvoice(nwcUrl, sats, "ZapSavr top-up");
      setInvoice(tx.invoice);
    } catch {
      setError("Couldn't create a payment request. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card stack">
      <h3>Ask for sats</h3>
      {invoice ? (
        <>
          <p className="small">Show this to whoever's sending you sats.</p>
          <div className="qr-wrap">
            <QRCodeSVG value={invoice} size={180} />
          </div>
        </>
      ) : (
        <>
          <div className="field">
            <label>How many sats?</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 2000" />
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

function PaySomeone({ nwcUrl, onClose }: { nwcUrl: string; onClose: () => void }) {
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
      setError("That payment didn't go through — check the request or your allowance.");
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
