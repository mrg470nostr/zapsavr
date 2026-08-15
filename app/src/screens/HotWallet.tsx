// Screens for the experimental, opt-in embedded hot wallet. Kept in its own
// file, deliberately not mixed into ParentFlow.tsx's existing NWC code, so
// that a bug here can never touch the tested "your wallet" (NWC) flow. See
// docs/ARCHITECTURE.md "Embedded hot wallet (experimental, opt-in)".

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Hud } from "../components/Hud";
import { CopyField } from "../components/CopyField";
import { makeInvoice, isDemoUrl } from "../lib/nwc";
import {
  encryptMnemonic,
  decryptMnemonic,
  saveEncryptedMnemonic,
  loadEncryptedMnemonic,
  clearHotWallet,
  type HotWalletNetwork,
} from "../lib/hotwallet-storage";
import {
  generateWalletMnemonic,
  isValidMnemonic,
  connectHotWallet,
  getHotWalletBalanceSats,
  receiveOnchainAddress,
  receiveLightningInvoice,
  sendHotWalletPayment,
  listHotWalletPayments,
  type SimpleHotWalletTx,
} from "../lib/hotwallet-sdk";
import type { BreezSdk } from "@breeztech/breez-sdk-spark/web";
import type { FamilyKid } from "../lib/storage";

// Module-level, not persisted anywhere: avoids re-decrypting the mnemonic and
// re-connecting on every navigation within the same session. Cleared on
// wallet deletion or full app reload.
let cachedSdk: BreezSdk | null = null;

// Breez requires this on mainnet (not regtest) purely to rate-limit access
// to their infrastructure — it doesn't control funds, those stay entirely
// with the seed above, so it's fine for it to end up in the public bundle
// the same way Breez's own browser SDK examples set it. See
// docs/ARCHITECTURE.md "Embedded hot wallet" for the full reasoning and
// docs/RUNBOOK.md for how to actually get one.
const BREEZ_API_KEY = import.meta.env.VITE_BREEZ_API_KEY as string | undefined;

async function getOrConnectSdk(pin: string, network: HotWalletNetwork): Promise<BreezSdk> {
  if (cachedSdk) return cachedSdk;
  const encrypted = loadEncryptedMnemonic();
  if (!encrypted) throw new Error("No hot wallet on this device.");
  const mnemonic = await decryptMnemonic(encrypted, pin);
  cachedSdk = await connectHotWallet(mnemonic, network, BREEZ_API_KEY);
  return cachedSdk;
}

function clearSdkCache() {
  cachedSdk = null;
}

export function HotWalletCard({ onClick }: { onClick: () => void }) {
  return (
    <button className="opt" onClick={onClick} style={{ borderColor: "var(--line)" }}>
      <span className="ico">⚡₿</span>
      <span className="t" style={{ flex: 1 }}>
        <b>Your hot wallet</b>
        <span>On-chain + Lightning, held in this app</span>
      </span>
      <span className="chip">EXPERIMENTAL</span>
    </button>
  );
}

function randomIndices(count: number, max: number): number[] {
  const chosen = new Set<number>();
  while (chosen.size < count) chosen.add(Math.floor(Math.random() * max));
  return [...chosen].sort((a, b) => a - b);
}

export function HotWalletSetup({
  pin,
  onDone,
  onCancel,
}: {
  pin: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [subStep, setSubStep] = useState<"intro" | "reveal" | "confirm" | "restore">("intro");
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [ackChecked, setAckChecked] = useState(false);
  const [checkIndices, setCheckIndices] = useState<number[]>([]);
  const [checkValues, setCheckValues] = useState<Record<number, string>>({});
  const [confirmError, setConfirmError] = useState("");
  const [saving, setSaving] = useState(false);
  const [restoreInput, setRestoreInput] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const [restoring, setRestoring] = useState(false);

  function startReveal() {
    setMnemonic(generateWalletMnemonic().split(" "));
    setSubStep("reveal");
  }

  function proceedToConfirm() {
    setCheckIndices(randomIndices(2, mnemonic.length));
    setCheckValues({});
    setConfirmError("");
    setSubStep("confirm");
  }

  async function handleConfirm() {
    const wrong = checkIndices.some(
      (i) => (checkValues[i] ?? "").trim().toLowerCase() !== mnemonic[i]
    );
    if (wrong) {
      setConfirmError("That doesn't match what you wrote down — check word by word and try again.");
      return;
    }
    setSaving(true);
    try {
      const encrypted = await encryptMnemonic(mnemonic.join(" "), pin);
      saveEncryptedMnemonic(encrypted);
      onDone();
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore() {
    setRestoreError("");
    const words = restoreInput
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (![12, 15, 18, 21, 24].includes(words.length)) {
      setRestoreError(`A recovery phrase is usually 12 words (sometimes 15–24) — this has ${words.length}.`);
      return;
    }
    const candidate = words.join(" ");
    if (!isValidMnemonic(candidate)) {
      setRestoreError("That doesn't look like a valid recovery phrase — check the spelling and word order.");
      return;
    }
    setRestoring(true);
    try {
      const encrypted = await encryptMnemonic(candidate, pin);
      saveEncryptedMnemonic(encrypted);
      onDone();
    } finally {
      setRestoring(false);
    }
  }

  if (subStep === "intro") {
    return (
      <div className="wrap">
        <Hud onBack={onCancel} />
        <div className="screen">
          <div className="stack">
            <h2>⚡₿ Embedded hot wallet</h2>
            <p className="lede">
              This is different from your other wallet. ZapSavr will generate a brand new Bitcoin wallet — on-chain
              and Lightning, one balance, auto-swapping between them — and hold its keys on this device, encrypted
              with your PIN.
            </p>
          </div>
          <div className="card stack">
            <p className="small">
              <b>This is real money with no safety net.</b> There's no customer support, no password reset, and no
              recovery if you lose both this device and your written-down backup. Only put in what you'd accept
              losing. If that's not what you want, your existing connected wallet (NWC) is the safer choice — this
              is an experimental option, opt-in, for understanding how a self-custodial hot wallet works.
            </p>
          </div>
          <button className="btn" onClick={startReveal}>
            I understand, continue
          </button>
          <button className="btn ghost sm" onClick={() => setSubStep("restore")}>
            Restore from a backup phrase instead
          </button>
          <button className="btn ghost sm" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (subStep === "restore") {
    return (
      <div className="wrap">
        <Hud onBack={() => setSubStep("intro")} />
        <div className="screen">
          <div className="stack">
            <h2>Restore from backup</h2>
            <p className="lede">
              Setting this up on a new device, or after losing the old one? Enter the recovery phrase from your
              backup, in order, separated by spaces.
            </p>
          </div>
          <div className="card stack">
            <div className="field">
              <label htmlFor="restore-words">Recovery phrase</label>
              <textarea
                id="restore-words"
                rows={4}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={restoreInput}
                onChange={(e) => setRestoreInput(e.target.value)}
              />
            </div>
            {restoreError && <p className="small" style={{ color: "var(--err)" }}>{restoreError}</p>}
            <button className="btn" onClick={handleRestore} disabled={!restoreInput || restoring}>
              {restoring ? "Restoring…" : "Restore wallet"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (subStep === "reveal") {
    return (
      <div className="wrap">
        <Hud onBack={onCancel} />
        <div className="screen">
          <div className="stack">
            <h2>Write these down</h2>
            <p className="lede">
              These 12 words are the only way to recover this wallet. Write them on paper, in order, and keep them
              somewhere private and offline. Anyone with these words can take everything in this wallet.
            </p>
          </div>
          <div className="card">
            <div className="word-grid">
              {mnemonic.map((w, i) => (
                <span key={i} className="small">
                  {i + 1}. {w}
                </span>
              ))}
            </div>
          </div>
          <label className="row" style={{ alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" checked={ackChecked} onChange={(e) => setAckChecked(e.target.checked)} />
            <span className="small">I've written these words down somewhere safe</span>
          </label>
          <button className="btn" onClick={proceedToConfirm} disabled={!ackChecked}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <Hud onBack={() => setSubStep("reveal")} />
      <div className="screen">
        <div className="stack">
          <h2>Confirm your backup</h2>
          <p className="lede">Type in word #{checkIndices[0] + 1} and word #{checkIndices[1] + 1} from your list.</p>
        </div>
        <div className="card stack">
          {checkIndices.map((i) => (
            <div className="field" key={i}>
              <label htmlFor={`confirm-word-${i}`}>Word #{i + 1}</label>
              <input
                id={`confirm-word-${i}`}
                type="text"
                autoComplete="off"
                autoCapitalize="off"
                value={checkValues[i] ?? ""}
                onChange={(e) => setCheckValues((prev) => ({ ...prev, [i]: e.target.value }))}
              />
            </div>
          ))}
          {confirmError && <p className="small" style={{ color: "var(--err)" }}>{confirmError}</p>}
          <button className="btn" onClick={handleConfirm} disabled={saving}>
            {saving ? "Saving…" : "Confirm and create wallet"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function HotWalletDetail({
  pin,
  network,
  kids,
  onBack,
  onDeleted,
}: {
  pin: string;
  network: HotWalletNetwork;
  kids: FamilyKid[];
  onBack: () => void;
  onDeleted: () => void;
}) {
  const [status, setStatus] = useState<"connecting" | "ok" | "error">("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [txs, setTxs] = useState<SimpleHotWalletTx[]>([]);
  const [mode, setMode] = useState<"none" | "send-choice" | "send-kid" | "send-paste" | "receive">("none");
  const [receiveMode, setReceiveMode] = useState<"choice" | "onchain" | "lightning">("choice");
  const [receiveResult, setReceiveResult] = useState<string | null>(null);
  const [receiveAmount, setReceiveAmount] = useState("");
  const [receiveDesc, setReceiveDesc] = useState("");
  const [receiveBusy, setReceiveBusy] = useState(false);
  const [sendInput, setSendInput] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendOk, setSendOk] = useState(false);
  const [kidSendSelected, setKidSendSelected] = useState<FamilyKid | null>(null);
  const [kidSendAmount, setKidSendAmount] = useState("");
  const [kidSendBusy, setKidSendBusy] = useState(false);
  const [kidSendError, setKidSendError] = useState("");
  const [kidSendOk, setKidSendOk] = useState(false);
  const [revealedMnemonic, setRevealedMnemonic] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function load() {
    setStatus("connecting");
    try {
      const sdk = await getOrConnectSdk(pin, network);
      const [bal, list] = await Promise.all([getHotWalletBalanceSats(sdk), listHotWalletPayments(sdk)]);
      setBalance(bal);
      setTxs(list);
      setStatus("ok");
    } catch (e) {
      setErrorMsg(
        e instanceof Error && e.message ? e.message : "Couldn't connect to the hot wallet."
      );
      setStatus("error");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGetOnchainAddress() {
    setReceiveMode("onchain");
    setReceiveBusy(true);
    try {
      const sdk = await getOrConnectSdk(pin, network);
      setReceiveResult(await receiveOnchainAddress(sdk));
    } catch {
      setReceiveResult(null);
    } finally {
      setReceiveBusy(false);
    }
  }

  async function handleGetLightningInvoice() {
    setReceiveBusy(true);
    try {
      const sdk = await getOrConnectSdk(pin, network);
      const sats = Math.max(1, Math.floor(Number(receiveAmount) || 0));
      setReceiveResult(await receiveLightningInvoice(sdk, sats, receiveDesc || "Received via ZapSavr"));
    } catch {
      setReceiveResult(null);
    } finally {
      setReceiveBusy(false);
    }
  }

  async function handleSend() {
    setSendError("");
    setSendOk(false);
    setSendBusy(true);
    try {
      const sdk = await getOrConnectSdk(pin, network);
      const amount = sendAmount ? Math.floor(Number(sendAmount)) : undefined;
      await sendHotWalletPayment(sdk, sendInput.trim(), amount);
      setSendOk(true);
      setSendInput("");
      setSendAmount("");
      await load();
    } catch {
      setSendError("That payment didn't go through — check the request, amount, or your balance.");
    } finally {
      setSendBusy(false);
    }
  }

  async function handleSendToKid(kid: FamilyKid, amountSats: number) {
    setKidSendError("");
    setKidSendOk(false);
    setKidSendBusy(true);
    try {
      const description = "Allowance top-up";
      if (isDemoUrl(kid.nwcUrl)) {
        // Demo kids have no real invoice to pay — makeInvoice's demo path
        // credits their fake balance directly as a side effect, so there's
        // nothing real to send from the hot wallet here.
        await makeInvoice(kid.nwcUrl, amountSats, description);
      } else {
        const sdk = await getOrConnectSdk(pin, network);
        const invoice = await makeInvoice(kid.nwcUrl, amountSats, description);
        await sendHotWalletPayment(sdk, invoice.invoice);
        await load();
      }
      setKidSendOk(true);
    } catch {
      setKidSendError("That didn't go through — check the kid's connection, your balance, or try again.");
    } finally {
      setKidSendBusy(false);
    }
  }

  async function handleViewBackup() {
    const encrypted = loadEncryptedMnemonic();
    if (!encrypted) return;
    setRevealedMnemonic(await decryptMnemonic(encrypted, pin));
  }

  function handleDelete() {
    clearHotWallet();
    clearSdkCache();
    onDeleted();
  }

  return (
    <div className="wrap">
      <Hud
        onBack={onBack}
        right={
          <span className={`chip ${status === "ok" ? "ok" : status === "error" ? "err" : ""}`}>
            {status === "ok" ? "Connected" : status === "error" ? "Unreachable" : "Connecting…"}
          </span>
        }
      />
      <div className="screen">
        <h2>⚡₿ Your hot wallet</h2>
        <p className="small">Experimental — on-chain and Lightning, one balance, held on this device.</p>

        <div className="card stack">
          <span className="small">CURRENT BALANCE</span>
          {status === "connecting" && <p className="small">Connecting…</p>}
          {status === "error" && (
            <p className="small" style={{ color: "var(--err)" }}>
              {errorMsg}
              {network === "mainnet" && /api ?key/i.test(errorMsg)
                ? " This experimental wallet needs a Breez API key that isn't configured for this build yet — see docs/ARCHITECTURE.md."
                : ""}
            </p>
          )}
          {status === "ok" && balance !== null && (
            <span className="jar-amount gold">{balance.toLocaleString()} sats</span>
          )}
        </div>

        {status === "ok" && (
          <>
            <div className="row">
              <button
                className="btn"
                style={{ flex: 1 }}
                onClick={() => {
                  setMode("receive");
                  setReceiveMode("choice");
                  setReceiveResult(null);
                }}
              >
                Receive
              </button>
              <button
                className="btn ghost"
                style={{ flex: 1 }}
                onClick={() => {
                  setMode("send-choice");
                  setKidSendSelected(null);
                  setKidSendAmount("");
                  setKidSendError("");
                  setKidSendOk(false);
                }}
              >
                Send
              </button>
            </div>

            {mode === "send-choice" && (
              <div className="card stack">
                {kids.length > 0 && (
                  <button className="btn" onClick={() => setMode("send-kid")}>
                    👦 Send to a kid
                  </button>
                )}
                <button className="btn ghost" onClick={() => setMode("send-paste")}>
                  🔗 Paste a payment request
                </button>
                <button className="btn ghost sm" onClick={() => setMode("none")}>
                  Close
                </button>
              </div>
            )}

            {mode === "send-kid" && !kidSendSelected && (
              <div className="card stack">
                <span className="small">SEND TO WHICH KID?</span>
                {kids.map((kid) => (
                  <button key={kid.id} className="opt" onClick={() => setKidSendSelected(kid)}>
                    <span className="ico">🧒</span>
                    <span className="t">
                      <b>{kid.nickname}</b>
                    </span>
                    {isDemoUrl(kid.nwcUrl) && <span className="chip">DEMO</span>}
                  </button>
                ))}
                <button className="btn ghost sm" onClick={() => setMode("send-choice")}>
                  Back
                </button>
              </div>
            )}

            {mode === "send-kid" && kidSendSelected && (
              <div className="card stack">
                <span className="small">SEND TO {kidSendSelected.nickname.toUpperCase()}</span>
                {kidSendOk ? (
                  <>
                    <p className="small" style={{ color: "var(--ok)" }}>
                      Sent {kidSendAmount} sats to {kidSendSelected.nickname}.
                    </p>
                    <button
                      className="btn ghost sm"
                      onClick={() => {
                        setMode("none");
                        setKidSendSelected(null);
                        setKidSendAmount("");
                        setKidSendOk(false);
                      }}
                    >
                      Close
                    </button>
                  </>
                ) : (
                  <>
                    <div className="field">
                      <label htmlFor="hw-kid-send-amount">Amount (sats)</label>
                      <input
                        id="hw-kid-send-amount"
                        type="number"
                        min={1}
                        value={kidSendAmount}
                        onChange={(e) => setKidSendAmount(e.target.value)}
                      />
                    </div>
                    {kidSendError && <p className="small" style={{ color: "var(--err)" }}>{kidSendError}</p>}
                    <button
                      className="btn"
                      disabled={!kidSendAmount || Number(kidSendAmount) <= 0 || kidSendBusy}
                      onClick={() => handleSendToKid(kidSendSelected, Math.floor(Number(kidSendAmount)))}
                    >
                      {kidSendBusy ? "Sending…" : `Send to ${kidSendSelected.nickname}`}
                    </button>
                    <button className="btn ghost sm" onClick={() => setKidSendSelected(null)}>
                      Choose a different kid
                    </button>
                  </>
                )}
              </div>
            )}

            {mode === "receive" && (
              <div className="card stack">
                {receiveMode === "choice" && (
                  <div className="row">
                    <button className="btn" style={{ flex: 1 }} onClick={handleGetOnchainAddress}>
                      ⛓️ On-chain
                    </button>
                    <button className="btn" style={{ flex: 1 }} onClick={() => setReceiveMode("lightning")}>
                      ⚡ Lightning
                    </button>
                  </div>
                )}
                {receiveMode === "lightning" && !receiveResult && (
                  <>
                    <div className="field">
                      <label htmlFor="hw-receive-amount">Amount (sats)</label>
                      <input
                        id="hw-receive-amount"
                        type="number"
                        min={1}
                        value={receiveAmount}
                        onChange={(e) => setReceiveAmount(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="hw-receive-desc">Description (optional)</label>
                      <input
                        id="hw-receive-desc"
                        type="text"
                        value={receiveDesc}
                        onChange={(e) => setReceiveDesc(e.target.value)}
                      />
                    </div>
                    <button className="btn" onClick={handleGetLightningInvoice} disabled={!receiveAmount || receiveBusy}>
                      {receiveBusy ? "Creating…" : "Get invoice"}
                    </button>
                  </>
                )}
                {receiveBusy && receiveMode === "onchain" && <p className="small">Getting address…</p>}
                {receiveResult && (
                  <>
                    <div className="qr-wrap" role="img" aria-label="QR code to receive payment">
                      <QRCodeSVG value={receiveResult} size={200} />
                    </div>
                    <CopyField label={receiveMode === "onchain" ? "Bitcoin address" : "Lightning invoice"} value={receiveResult} />
                  </>
                )}
                <button
                  className="btn ghost sm"
                  onClick={() => {
                    setMode("none");
                    load();
                  }}
                >
                  Close
                </button>
              </div>
            )}

            {mode === "send-paste" && (
              <div className="card stack">
                <div className="field">
                  <label htmlFor="hw-send-input">Bitcoin address, Lightning invoice, or LNURL</label>
                  <textarea id="hw-send-input" rows={3} value={sendInput} onChange={(e) => setSendInput(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="hw-send-amount">Amount (sats) — only needed for amountless requests</label>
                  <input
                    id="hw-send-amount"
                    type="number"
                    min={1}
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                  />
                </div>
                {sendError && <p className="small" style={{ color: "var(--err)" }}>{sendError}</p>}
                {sendOk && <p className="small" style={{ color: "var(--ok)" }}>Sent.</p>}
                <button className="btn" onClick={handleSend} disabled={!sendInput || sendBusy}>
                  {sendBusy ? "Sending…" : "Send"}
                </button>
                <button className="btn ghost sm" onClick={() => setMode("none")}>
                  Close
                </button>
              </div>
            )}

            <div className="card stack">
              <span className="small">RECENT ACTIVITY</span>
              {txs.length === 0 ? (
                <p className="small">Nothing yet.</p>
              ) : (
                txs.map((tx, i) => (
                  <div key={i} className="row" style={{ justifyContent: "space-between" }}>
                    <span className="small">{tx.status === "pending" ? "Pending" : tx.type === "incoming" ? "Received" : "Sent"}</span>
                    <span className="small" style={{ color: tx.type === "incoming" ? "var(--ok)" : undefined }}>
                      {tx.type === "incoming" ? "+" : "-"}
                      {tx.amountSats.toLocaleString()} sats
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {status === "error" && (
          <button className="btn ghost sm" onClick={load}>
            Try again
          </button>
        )}

        <details>
          <summary className="small">For the curious: view backup phrase</summary>
          {revealedMnemonic ? (
            <div className="card stack">
              <p className="small" style={{ color: "var(--err)" }}>
                Keep this private. Anyone who sees it can take everything in this wallet.
              </p>
              <div className="word-grid">
                {revealedMnemonic.split(" ").map((w, i) => (
                  <span key={i} className="small">
                    {i + 1}. {w}
                  </span>
                ))}
              </div>
              <button className="btn ghost sm" onClick={() => setRevealedMnemonic(null)}>
                Hide
              </button>
            </div>
          ) : (
            <button className="btn ghost sm" onClick={handleViewBackup}>
              Show backup phrase
            </button>
          )}
        </details>

        <div className="spacer" />

        {confirmingDelete ? (
          <div className="card stack">
            <p className="small">
              This deletes the hot wallet's keys from this device. If you haven't backed up the phrase, any sats in
              it are gone for good.
            </p>
            <div className="row">
              <button className="btn danger" onClick={handleDelete} style={{ flex: 1 }}>
                Delete
              </button>
              <button className="btn ghost" onClick={() => setConfirmingDelete(false)} style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="btn ghost sm" onClick={() => setConfirmingDelete(true)}>
            Delete this wallet from device
          </button>
        )}
      </div>
    </div>
  );
}
