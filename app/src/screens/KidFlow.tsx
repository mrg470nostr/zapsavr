import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hud } from "../components/Hud";
import { ActionCard } from "../components/ActionCard";
import { QrScan } from "../components/QrScan";
import { ReceivePanel } from "../components/ReceivePanel";
import { SendPanel } from "../components/SendPanel";
import { isValidNwcUrl, isDemoUrl, demoUrlFor, getBalanceSats } from "../lib/nwc";
import { resetDemo } from "../lib/demo";
import { loadState, saveState, clearState, newId, type KidState, type SavingTarget } from "../lib/storage";

type Step = "pair" | "goal-new" | "home" | "goal-detail";

const KID_BADGE = <span className="chip">🧒 Kid mode</span>;

export function KidFlow() {
  const navigate = useNavigate();
  const existing = loadState();
  const kidExisting = existing?.role === "kid" ? existing : null;

  const [step, setStep] = useState<Step>(
    kidExisting ? (kidExisting.targets.length > 0 ? "home" : "goal-new") : "pair"
  );
  const [nwcUrl, setNwcUrl] = useState(kidExisting?.nwcUrl ?? "");
  const [nickname, setNickname] = useState(kidExisting?.nickname ?? "");
  const [targets, setTargets] = useState<SavingTarget[]>(kidExisting?.targets ?? []);
  const [pauseThreshold, setPauseThreshold] = useState<number | undefined>(kidExisting?.bigPurchasePauseSats);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceStatus, setBalanceStatus] = useState<"loading" | "ok" | "error">("loading");

  // Persists to storage and updates state in one place, so every mutation re-renders immediately.
  function persistTargets(nextTargets: SavingTarget[]) {
    saveState({ role: "kid", nickname, nwcUrl, targets: nextTargets, bigPurchasePauseSats: pauseThreshold });
    setTargets(nextTargets);
  }

  function persistPauseThreshold(next: number | undefined) {
    saveState({ role: "kid", nickname, nwcUrl, targets, bigPurchasePauseSats: next });
    setPauseThreshold(next);
  }

  async function refreshBalance() {
    setBalanceStatus((s) => (s === "ok" ? s : "loading"));
    try {
      const sats = await getBalanceSats(nwcUrl);
      setBalance(sats);
      setBalanceStatus("ok");
    } catch {
      setBalanceStatus("error");
    }
  }

  useEffect(() => {
    if (nwcUrl && (step === "home" || step === "goal-detail")) refreshBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nwcUrl, step]);

  async function handlePair(urlOverride?: string) {
    const url = urlOverride ?? nwcUrl;
    setError("");
    if (!isValidNwcUrl(url)) {
      setError("That doesn't look like a connection code. Ask a parent to show it again.");
      return;
    }
    setChecking(true);
    try {
      await getBalanceSats(url);
      const state: KidState = { role: "kid", nickname: nickname || "friend", nwcUrl: url, targets: [] };
      saveState(state);
      setNwcUrl(url);
      setStep("goal-new");
    } catch {
      setError("Couldn't connect. Ask a parent to check their wallet app.");
    } finally {
      setChecking(false);
    }
  }

  function handleTryDemo() {
    handlePair(demoUrlFor("kid-solo"));
  }

  function handleReset() {
    if (isDemoUrl(nwcUrl)) resetDemo(nwcUrl);
    clearState();
    navigate("/");
  }

  function handleCreateGoal(name: string, goalSats: number) {
    const target: SavingTarget = { id: newId(), name, goalSats, allocatedSats: 0 };
    persistTargets([...targets, target]);
    setStep("home");
  }

  const totalAllocated = targets.reduce((sum, t) => sum + t.allocatedSats, 0);
  const unallocated = balance !== null ? Math.max(0, balance - totalAllocated) : null;

  function handleAllocate(goalId: string, amount: number) {
    if (amount <= 0 || unallocated === null || amount > unallocated) return;
    persistTargets(targets.map((t) => (t.id === goalId ? { ...t, allocatedSats: t.allocatedSats + amount } : t)));
  }

  function handleDeallocate(goalId: string, amount: number) {
    const target = targets.find((t) => t.id === goalId);
    if (!target || amount <= 0 || amount > target.allocatedSats) return;
    persistTargets(targets.map((t) => (t.id === goalId ? { ...t, allocatedSats: t.allocatedSats - amount } : t)));
  }

  function handleRenameGoal(goalId: string, name: string) {
    if (!name.trim()) return;
    persistTargets(targets.map((t) => (t.id === goalId ? { ...t, name: name.trim() } : t)));
  }

  function handleChangeGoalTarget(goalId: string, goalSats: number) {
    if (goalSats <= 0) return;
    persistTargets(targets.map((t) => (t.id === goalId ? { ...t, goalSats } : t)));
  }

  function handleDeleteGoal(goalId: string) {
    persistTargets(targets.filter((t) => t.id !== goalId));
    setSelectedGoalId(null);
    setStep("home");
  }

  // amountSats is null for "any amount" invoices that don't encode one — nothing to deduct then.
  function handlePayFromGoal(goalId: string, amountSats: number | null) {
    if (amountSats === null) return;
    persistTargets(
      targets.map((t) =>
        t.id === goalId ? { ...t, allocatedSats: Math.max(0, t.allocatedSats - amountSats) } : t
      )
    );
  }

  if (step === "pair") {
    return (
      <div className="wrap">
        <Hud onBack={() => navigate("/")} right={KID_BADGE} />
        <div className="screen">
          <div className="stack">
            <h2>Connect to a parent</h2>
            <p className="lede">Ask a parent to open ZapSavr and show you a code, then scan it here.</p>
          </div>
          <div className="card stack">
            <div className="field">
              <label htmlFor="kid-nickname">Your name</label>
              <input
                id="kid-nickname"
                type="text"
                placeholder="e.g. Leo"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="kid-pair-code">Scan or paste the code</label>
              <QrScan onScan={setNwcUrl} />
              <textarea
                id="kid-pair-code"
                placeholder="nostr+walletconnect://..."
                value={nwcUrl}
                onChange={(e) => setNwcUrl(e.target.value)}
                rows={4}
                style={{ marginTop: 8 }}
              />
            </div>
            {error && <p className="small" style={{ color: "var(--err)" }}>{error}</p>}
            <button className="btn" onClick={() => handlePair()} disabled={!nwcUrl || checking}>
              {checking ? "Connecting…" : "Connect"}
            </button>
            <button className="btn ghost sm" onClick={handleTryDemo} disabled={checking}>
              🧪 Try a demo (no wallet needed)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "goal-new") {
    return (
      <GoalForm
        isFirst={targets.length === 0}
        onCancel={targets.length > 0 ? () => setStep("home") : undefined}
        onSave={handleCreateGoal}
      />
    );
  }

  if (step === "goal-detail" && selectedGoalId) {
    const goal = targets.find((t) => t.id === selectedGoalId);
    if (goal) {
      return (
        <GoalDetail
          nwcUrl={nwcUrl}
          goal={goal}
          unallocated={unallocated}
          onBack={() => {
            setSelectedGoalId(null);
            setStep("home");
          }}
          onAllocate={(amount) => handleAllocate(goal.id, amount)}
          onDeallocate={(amount) => handleDeallocate(goal.id, amount)}
          onRename={(name) => handleRenameGoal(goal.id, name)}
          onChangeTarget={(sats) => handleChangeGoalTarget(goal.id, sats)}
          onDelete={() => handleDeleteGoal(goal.id)}
          onPaid={(amountSats) => {
            handlePayFromGoal(goal.id, amountSats);
            refreshBalance();
          }}
          confirmAboveSats={pauseThreshold}
        />
      );
    }
  }

  return (
    <KidHome
      nwcUrl={nwcUrl}
      nickname={nickname}
      targets={targets}
      balance={balance}
      balanceStatus={balanceStatus}
      unallocated={unallocated}
      pauseThreshold={pauseThreshold}
      onSetPauseThreshold={persistPauseThreshold}
      onRefreshBalance={refreshBalance}
      onReset={handleReset}
      onNewGoal={() => setStep("goal-new")}
      onOpenGoal={(id) => {
        setSelectedGoalId(id);
        setStep("goal-detail");
      }}
    />
  );
}

function GoalForm({
  isFirst,
  onCancel,
  onSave,
}: {
  isFirst: boolean;
  onCancel?: () => void;
  onSave: (name: string, goalSats: number) => void;
}) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");

  function handleSave() {
    const goalSats = parseInt(goal, 10);
    if (!name || !goalSats || goalSats <= 0) return;
    onSave(name, goalSats);
  }

  return (
    <div className="wrap">
      <Hud onBack={onCancel} right={KID_BADGE} />
      <div className="screen">
        <div className="stack">
          <h2>{isFirst ? "What are you saving for?" : "Add another goal"}</h2>
          <p className="lede">
            {isFirst ? "Pick something you want — this is the whole point." : "Give it a name and a target."}
          </p>
        </div>
        <div className="card stack">
          <div className="field">
            <label htmlFor="goal-name">What is it?</label>
            <input
              id="goal-name"
              type="text"
              placeholder="e.g. New skateboard"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="goal-target-sats">How many sats?</label>
            <input
              id="goal-target-sats"
              type="number"
              placeholder="e.g. 50000"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </div>
          <button className="btn" onClick={handleSave} disabled={!name || !goal}>
            {isFirst ? "Start saving" : "Add goal"}
          </button>
          {onCancel && (
            <button className="btn ghost sm" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function KidHome({
  nwcUrl,
  nickname,
  targets,
  balance,
  balanceStatus,
  unallocated,
  pauseThreshold,
  onSetPauseThreshold,
  onRefreshBalance,
  onReset,
  onNewGoal,
  onOpenGoal,
}: {
  nwcUrl: string;
  nickname: string;
  targets: SavingTarget[];
  balance: number | null;
  balanceStatus: "loading" | "ok" | "error";
  unallocated: number | null;
  pauseThreshold: number | undefined;
  onSetPauseThreshold: (value: number | undefined) => void;
  onRefreshBalance: () => void;
  onReset: () => void;
  onNewGoal: () => void;
  onOpenGoal: (id: string) => void;
}) {
  const [mode, setMode] = useState<"none" | "ask" | "pay" | "offline" | "settings">("none");
  const [pauseDraft, setPauseDraft] = useState(pauseThreshold ? String(pauseThreshold) : "");

  return (
    <div className="wrap">
      <Hud
        right={
          <>
            {KID_BADGE}
            {isDemoUrl(nwcUrl) && <span className="chip">DEMO</span>}
            <span className={`chip ${balanceStatus === "ok" ? "ok" : balanceStatus === "error" ? "err" : ""}`}>
              {balanceStatus === "ok" ? "Connected" : balanceStatus === "error" ? "Unreachable" : "…"}
            </span>
          </>
        }
      />
      <div className="screen">
        <h2>Hi, {nickname}! 👋</h2>

        <div className="card stack center">
          <span className="small">YOUR WALLET</span>
          {balance === null ? (
            <p className="small">{balanceStatus === "error" ? "Can't check right now" : "Loading…"}</p>
          ) : (
            <span className="jar-amount gold">{balance.toLocaleString()} sats</span>
          )}
          {unallocated !== null && unallocated > 0 && (
            <span className="small">{unallocated.toLocaleString()} sats not in a goal yet</span>
          )}
        </div>

        <div className="stack">
          {targets.map((goal) => {
            const progress = Math.min(100, (goal.allocatedSats / goal.goalSats) * 100);
            return (
              <button key={goal.id} className="opt" onClick={() => onOpenGoal(goal.id)}>
                <span className="ico">🎯</span>
                <span className="t" style={{ flex: 1 }}>
                  <b>{goal.name}</b>
                  <span>
                    {goal.allocatedSats.toLocaleString()} / {goal.goalSats.toLocaleString()} sats
                  </span>
                  {/* No role="progressbar" here: this bar sits inside a <button>, and its
                      info (allocated/target sats) is already in the button's visible text,
                      so a nested widget role would be redundant and an ARIA anti-pattern. */}
                  <div className="track" style={{ marginTop: 6 }}>
                    <i style={{ width: `${progress}%` }} />
                  </div>
                </span>
                {progress >= 100 && <span className="chip ok">🎉</span>}
              </button>
            );
          })}
        </div>

        <button className="btn ghost sm" onClick={onNewGoal}>
          + New goal
        </button>

        <div className="row">
          <ActionCard label="Ask for sats" icon="📥" onClick={() => setMode("ask")} />
          <ActionCard label="Pay" icon="⚡" primary onClick={() => setMode("pay")} />
        </div>
        <div className="row">
          <ActionCard label="Offline payment" icon="📶" onClick={() => setMode("offline")} />
        </div>

        {mode === "ask" && <ReceivePanel nwcUrl={nwcUrl} onClose={() => { setMode("none"); onRefreshBalance(); }} />}
        {mode === "pay" && (
          <SendPanel
            nwcUrl={nwcUrl}
            onClose={() => { setMode("none"); onRefreshBalance(); }}
            confirmAboveSats={pauseThreshold}
          />
        )}
        {mode === "settings" && (
          <div className="card stack">
            <h3>Pause before a big purchase</h3>
            <p className="small">
              A reminder just for you — before paying more than this, ZapSavr will ask "are you sure?" This
              doesn't lock anything, it's here to help you pause and think, the way saving up for something
              teaches patience.
            </p>
            <div className="field">
              <label htmlFor="pause-threshold">Ask me before paying more than</label>
              <input
                id="pause-threshold"
                type="number"
                placeholder="e.g. 5000"
                value={pauseDraft}
                onChange={(e) => setPauseDraft(e.target.value)}
              />
            </div>
            <div className="row">
              <button
                className="btn sm"
                style={{ flex: 1 }}
                onClick={() => {
                  const n = parseInt(pauseDraft, 10);
                  onSetPauseThreshold(n > 0 ? n : undefined);
                  setMode("none");
                }}
              >
                Save
              </button>
              {pauseThreshold !== undefined && (
                <button
                  className="btn ghost sm"
                  style={{ flex: 1 }}
                  onClick={() => {
                    onSetPauseThreshold(undefined);
                    setPauseDraft("");
                    setMode("none");
                  }}
                >
                  Turn off
                </button>
              )}
            </div>
          </div>
        )}
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
        <button className="btn ghost sm" onClick={() => setMode("settings")}>
          {pauseThreshold
            ? `⚙️ Pause before paying over ${pauseThreshold.toLocaleString()} sats`
            : "⚙️ Pause before a big purchase"}
        </button>
        <button className="btn ghost sm" onClick={onReset}>
          Disconnect this device
        </button>
      </div>
    </div>
  );
}

function GoalDetail({
  nwcUrl,
  goal,
  unallocated,
  onBack,
  onAllocate,
  onDeallocate,
  onRename,
  onChangeTarget,
  onDelete,
  onPaid,
  confirmAboveSats,
}: {
  nwcUrl: string;
  goal: SavingTarget;
  unallocated: number | null;
  onBack: () => void;
  onAllocate: (amount: number) => void;
  onDeallocate: (amount: number) => void;
  onRename: (name: string) => void;
  onChangeTarget: (goalSats: number) => void;
  onDelete: () => void;
  onPaid: (amountSats: number | null) => void;
  confirmAboveSats?: number;
}) {
  const [addAmount, setAddAmount] = useState("");
  const [takeAmount, setTakeAmount] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(goal.name);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetDraft, setTargetDraft] = useState(String(goal.goalSats));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showPay, setShowPay] = useState(false);

  const progress = Math.min(100, (goal.allocatedSats / goal.goalSats) * 100);

  return (
    <div className="wrap">
      <Hud onBack={onBack} right={KID_BADGE} />
      <div className="screen">
        {editingName ? (
          <div className="row">
            <input
              type="text"
              aria-label="Goal name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="btn sm"
              onClick={() => {
                onRename(nameDraft);
                setEditingName(false);
              }}
            >
              Save
            </button>
          </div>
        ) : (
          <h2>
            <button type="button" onClick={() => setEditingName(true)} aria-label={`Edit name, currently ${goal.name}`}>
              {goal.name} ✏️
            </button>
          </h2>
        )}

        <div className="card stack center">
          <span className="jar-amount gold">{goal.allocatedSats.toLocaleString()} sats</span>
          {editingTarget ? (
            <div className="row">
              <input
                type="number"
                aria-label="Goal target in sats"
                value={targetDraft}
                onChange={(e) => setTargetDraft(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                className="btn sm"
                onClick={() => {
                  const n = parseInt(targetDraft, 10);
                  if (n > 0) onChangeTarget(n);
                  setEditingTarget(false);
                }}
              >
                Save
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="jar-goal"
              onClick={() => setEditingTarget(true)}
              aria-label={`Edit target, currently ${goal.goalSats} sats`}
            >
              of {goal.goalSats.toLocaleString()} sats ✏️
            </button>
          )}
          <div
            className="track"
            role="progressbar"
            aria-valuenow={goal.allocatedSats}
            aria-valuemin={0}
            aria-valuemax={goal.goalSats}
            aria-label={`${goal.name} progress`}
          >
            <i style={{ width: `${progress}%` }} />
          </div>
          {progress >= 100 && <span className="chip ok">Goal reached! 🎉</span>}
        </div>

        <button className="btn" onClick={() => setShowPay((v) => !v)}>
          ⚡ Pay from this goal
        </button>
        {showPay && (
          <SendPanel
            nwcUrl={nwcUrl}
            failMessage="That payment didn't go through — check the request or your wallet."
            onClose={() => setShowPay(false)}
            onPaid={(amountSats) => onPaid(amountSats)}
            confirmAboveSats={confirmAboveSats}
          />
        )}

        <div className="card stack">
          <label htmlFor="goal-add-amount">Add from your wallet</label>
          <p className="small">
            {unallocated !== null ? `${unallocated.toLocaleString()} sats not in a goal yet` : "Checking your wallet…"}
          </p>
          <div className="row">
            <input
              id="goal-add-amount"
              type="number"
              placeholder="e.g. 1000"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="btn sm"
              onClick={() => {
                onAllocate(parseInt(addAmount, 10) || 0);
                setAddAmount("");
              }}
              disabled={!addAmount || !unallocated}
            >
              Add
            </button>
          </div>
        </div>

        <div className="card stack">
          <label htmlFor="goal-take-amount">Move back to your wallet</label>
          <div className="row">
            <input
              id="goal-take-amount"
              type="number"
              placeholder="e.g. 500"
              value={takeAmount}
              onChange={(e) => setTakeAmount(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="btn ghost sm"
              onClick={() => {
                onDeallocate(parseInt(takeAmount, 10) || 0);
                setTakeAmount("");
              }}
              disabled={!takeAmount}
            >
              Move out
            </button>
          </div>
        </div>

        <p className="small">
          Goals are just labels over your one real balance — moving sats between them is instant and free. Paying
          from this screen keeps the number here accurate, but nothing actually locks the sats away: spending them
          from the main "Pay" button on your wallet won't update this goal automatically.
        </p>

        <div className="spacer" />

        {confirmingDelete ? (
          <div className="card stack">
            <p className="small">
              This deletes "{goal.name}". Any sats in it go back to "not in a goal yet" — nothing is spent.
            </p>
            <div className="row">
              <button className="btn danger" onClick={onDelete} style={{ flex: 1 }}>
                Delete
              </button>
              <button className="btn ghost" onClick={() => setConfirmingDelete(false)} style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="btn danger" onClick={() => setConfirmingDelete(true)}>
            Delete this goal
          </button>
        )}
      </div>
    </div>
  );
}
