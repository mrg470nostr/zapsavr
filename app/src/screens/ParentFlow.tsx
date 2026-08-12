import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Hud } from "../components/Hud";
import { PinEntry } from "../components/PinEntry";
import { isValidNwcUrl, isDemoUrl, demoUrlFor, getBalanceSats, getBudget, makeInvoice, listTransactions, type SimpleTx } from "../lib/nwc";
import { resetDemo } from "../lib/demo";
import {
  loadState,
  saveState,
  clearState,
  isParentUnlocked,
  setParentUnlocked,
  newKidId,
  type ParentState,
  type FamilyKid,
} from "../lib/storage";

type Step = "connect" | "pair" | "pin-setup" | "locked" | "family" | "kid";

function currentFamily(): ParentState {
  const existing = loadState();
  return existing?.role === "parent" ? existing : { role: "parent", kids: [] };
}

function initialStep(): Step {
  const family = currentFamily();
  if (family.kids.length === 0) return "connect";
  if (family.pin && !isParentUnlocked()) return "locked";
  return "family";
}

export function ParentFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(initialStep());
  const [nwcUrl, setNwcUrl] = useState("");
  const [kidNickname, setKidNickname] = useState("");
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [pinDraft, setPinDraft] = useState<string | null>(null);
  const [pinError, setPinError] = useState("");
  const [pinShake, setPinShake] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const family = currentFamily();
  const isFirstKid = family.kids.length === 0;

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
      setNwcUrl(url);
      setStep("pair");
    } catch {
      setError("Couldn't reach that wallet connection. Double check it's still active.");
    } finally {
      setChecking(false);
    }
  }

  function handleTryDemo() {
    if (isFirstKid) {
      const kids: FamilyKid[] = [
        { id: newKidId(), nickname: "Leo (demo)", nwcUrl: demoUrlFor("leo") },
        { id: newKidId(), nickname: "Mia (demo)", nwcUrl: demoUrlFor("mia") },
      ];
      saveState({ role: "parent", kids });
      setStep("family");
    } else {
      setNwcUrl(demoUrlFor(`kid-${newKidId()}`));
      setStep("pair");
    }
  }

  function handleConfirmPairing() {
    const newKid: FamilyKid = { id: newKidId(), nickname: kidNickname || "your kid", nwcUrl };
    const updated: ParentState = { role: "parent", pin: family.pin, kids: [...family.kids, newKid] };
    saveState(updated);
    setSelectedKidId(newKid.id);
    setKidNickname("");
    setNwcUrl("");
    if (!updated.pin) {
      setStep("pin-setup");
    } else {
      setStep("family");
    }
  }

  function handlePinSetupEntry(pin: string) {
    if (pinDraft === null) {
      setPinDraft(pin);
      setPinError("");
      return;
    }
    if (pin === pinDraft) {
      const prev = currentFamily();
      saveState({ ...prev, pin });
      setParentUnlocked();
      setStep("family");
    } else {
      setPinError("Those didn't match — try again.");
      setPinDraft(null);
    }
  }

  function handleUnlockEntry(pin: string) {
    if (family.pin && pin === family.pin) {
      setParentUnlocked();
      setStep("family");
    } else {
      setPinShake(true);
      setPinError("Wrong PIN, try again.");
      setTimeout(() => setPinShake(false), 300);
    }
  }

  function handleDisconnectAll() {
    family.kids.forEach((k) => {
      if (isDemoUrl(k.nwcUrl)) resetDemo(k.nwcUrl);
    });
    clearState();
    navigate("/");
  }

  function handleRemoveKid(kidId: string) {
    const kid = family.kids.find((k) => k.id === kidId);
    if (kid && isDemoUrl(kid.nwcUrl)) resetDemo(kid.nwcUrl);
    const updated: ParentState = { ...family, kids: family.kids.filter((k) => k.id !== kidId) };
    saveState(updated);
    setSelectedKidId(null);
    setStep(updated.kids.length === 0 ? "connect" : "family");
  }

  if (step === "connect") {
    return (
      <div className="wrap">
        <Hud onBack={() => (isFirstKid ? navigate("/") : setStep("family"))} />
        <div className="screen">
          <div className="stack">
            <h2>{isFirstKid ? "Connect your wallet" : "Add another kid"}</h2>
            <p className="lede">
              {isFirstKid
                ? "This is where your money actually lives — ZapSavr just gets permission to use a little of it."
                : "Each kid gets their own independently budgeted connection — one kid's spending never touches another's."}
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
              In your NWC-capable wallet (create a fresh connection for each kid), set a weekly budget, then paste
              the connection string it gives you here.
            </p>
            {error && <p className="small" style={{ color: "var(--err)" }}>{error}</p>}
            <button className="btn" onClick={() => handleConnect()} disabled={!nwcUrl || checking}>
              {checking ? "Checking…" : "Connect"}
            </button>
            {isFirstKid && (
              <button className="btn ghost sm" onClick={handleTryDemo} disabled={checking}>
                🧪 Try a demo (no wallet needed)
              </button>
            )}
            {!isFirstKid && (
              <button className="btn ghost sm" onClick={() => setStep("family")}>
                Cancel
              </button>
            )}
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
              {isDemoUrl(nwcUrl)
                ? "This is a demo, so there's no real code to scan. On the kid's device, just tap \"Try a demo\" on its own pairing screen."
                : "Open ZapSavr on their phone and scan this to connect their jar."}
            </p>
          </div>
          {!isDemoUrl(nwcUrl) && (
            <div className="qr-wrap">
              <QRCodeSVG value={nwcUrl} size={220} />
            </div>
          )}
          <div className="card stack">
            <div className="field">
              <label>Kid's nickname</label>
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
                ? "This keeps your family's allowance and disconnect controls to you."
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
            <p className="lede">Protecting your family's allowance controls.</p>
          </div>
          {pinError && (
            <p className="small center" style={{ color: "var(--err)" }}>
              {pinError}
            </p>
          )}
          <PinEntry onComplete={handleUnlockEntry} shake={pinShake} />
          <div className="spacer" />
          <button className="btn ghost sm" onClick={handleDisconnectAll}>
            Forgot it? Disconnect and set up again
          </button>
        </div>
      </div>
    );
  }

  if (step === "kid" && selectedKidId) {
    const kid = family.kids.find((k) => k.id === selectedKidId);
    if (kid) {
      return (
        <KidDetail
          key={kid.id}
          kid={kid}
          onBack={() => setStep("family")}
          onRemove={() => handleRemoveKid(kid.id)}
        />
      );
    }
    // Selected kid no longer exists (e.g. removed elsewhere) — fall through to family view below.
  }

  return (
    <div className="wrap">
      <Hud />
      <div className="screen">
        <h2>Your family</h2>
        <div className="stack">
          {family.kids.map((kid) => (
            <KidCard
              key={kid.id}
              kid={kid}
              refreshTick={refreshTick}
              onClick={() => {
                setSelectedKidId(kid.id);
                setStep("kid");
              }}
            />
          ))}
        </div>
        <button
          className="btn ghost sm"
          onClick={() => {
            setNwcUrl("");
            setKidNickname("");
            setStep("connect");
          }}
        >
          + Add a kid
        </button>
        <button className="btn ghost sm" onClick={() => setRefreshTick((t) => t + 1)}>
          Refresh balances
        </button>
        <div className="spacer" />
        <button className="btn danger" onClick={handleDisconnectAll}>
          Disconnect everything
        </button>
      </div>
    </div>
  );
}

function KidCard({
  kid,
  onClick,
  refreshTick,
}: {
  kid: FamilyKid;
  onClick: () => void;
  refreshTick: number;
}) {
  const [balance, setBalance] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getBalanceSats(kid.nwcUrl)
      .then((sats) => {
        if (cancelled) return;
        setBalance(sats);
        setStatus("ok");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [kid.nwcUrl, refreshTick]);

  return (
    <button className="opt" onClick={onClick}>
      <span className="ico">🧒</span>
      <span className="t" style={{ flex: 1 }}>
        <b>{kid.nickname}</b>
        <span>
          {status === "loading" && "Checking…"}
          {status === "error" && "Unreachable"}
          {status === "ok" && `${balance?.toLocaleString()} sats`}
        </span>
      </span>
      {isDemoUrl(kid.nwcUrl) && <span className="chip">DEMO</span>}
    </button>
  );
}

function KidDetail({
  kid,
  onBack,
  onRemove,
}: {
  kid: FamilyKid;
  onBack: () => void;
  onRemove: () => void;
}) {
  const [balance, setBalance] = useState<number | null>(null);
  const [budget, setBudget] = useState<{ used: number; total: number } | null>(null);
  const [txs, setTxs] = useState<SimpleTx[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);

  async function load() {
    try {
      const sats = await getBalanceSats(kid.nwcUrl);
      const b = await getBudget(kid.nwcUrl);
      const history = await listTransactions(kid.nwcUrl);
      setBalance(sats);
      if ("total_budget" in b) setBudget({ used: b.used_budget, total: b.total_budget });
      setTxs(history);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kid.nwcUrl]);

  return (
    <div className="wrap">
      <Hud
        onBack={onBack}
        right={
          <>
            {isDemoUrl(kid.nwcUrl) && <span className="chip">DEMO</span>}
            <span className={`chip ${status === "ok" ? "ok" : status === "error" ? "err" : ""}`}>
              {status === "ok" ? "Connected" : status === "error" ? "Unreachable" : "Checking…"}
            </span>
          </>
        }
      />
      <div className="screen">
        <h2>{kid.nickname}'s jar</h2>

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

        <button className="btn" onClick={() => setShowTopUp((v) => !v)}>
          Send sats now
        </button>
        {showTopUp && (
          <TopUp
            nwcUrl={kid.nwcUrl}
            onDone={() => {
              setShowTopUp(false);
              load();
            }}
          />
        )}

        <div className="card stack">
          <span className="small">RECENT ACTIVITY</span>
          {txs.length === 0 ? (
            <p className="small">Nothing yet.</p>
          ) : (
            txs.map((tx, i) => (
              <div key={i} className="row" style={{ justifyContent: "space-between" }}>
                <span className="small">{tx.description}</span>
                <span className="small" style={{ color: tx.type === "incoming" ? "var(--ok)" : undefined }}>
                  {tx.type === "incoming" ? "+" : "-"}
                  {tx.amountSats.toLocaleString()} sats
                </span>
              </div>
            ))
          )}
        </div>

        <div className="spacer" />

        {confirmingRemove ? (
          <div className="card stack">
            <p className="small">
              This removes {kid.nickname} from your family list on this device. To fully revoke their spending,
              also delete the connection from your wallet app.
            </p>
            <div className="row">
              <button className="btn danger" onClick={onRemove} style={{ flex: 1 }}>
                Remove
              </button>
              <button className="btn ghost" onClick={() => setConfirmingRemove(false)} style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="btn danger" onClick={() => setConfirmingRemove(true)}>
            Remove {kid.nickname}
          </button>
        )}
      </div>
    </div>
  );
}

function TopUp({ nwcUrl, onDone }: { nwcUrl: string; onDone: () => void }) {
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
      const tx = await makeInvoice(nwcUrl, sats, "Allowance top-up");
      setInvoice(tx.invoice);
    } catch {
      setError("Couldn't create a payment request. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card stack">
      <h3>Send sats now</h3>
      {invoice ? (
        <>
          <p className="small">
            Scan this with your own wallet app to send it — ZapSavr never moves money on its own.
          </p>
          <div className="qr-wrap">
            <QRCodeSVG value={invoice} size={180} />
          </div>
          <button className="btn ghost sm" onClick={onDone}>
            Done
          </button>
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
    </div>
  );
}
