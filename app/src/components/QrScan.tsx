import { useEffect, useRef, useState } from "react";

const SUPPORTED = typeof window !== "undefined" && "BarcodeDetector" in window;

export function QrScan({ onScan }: { onScan: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setOpen(false);
  }

  useEffect(() => stop, []);

  async function start() {
    setError("");
    setOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            onScan(codes[0].rawValue.replace(/^lightning:/i, ""));
            stop();
            return;
          }
        } catch {
          // keep trying, a single failed frame isn't fatal
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError("Couldn't access the camera. You can still paste the code below.");
    }
  }

  if (!SUPPORTED) return null;

  if (!open) {
    return (
      <button type="button" className="btn ghost sm" onClick={start}>
        📷 Scan with camera
      </button>
    );
  }

  return (
    <div className="card stack">
      {error ? (
        <p className="small" style={{ color: "var(--err)" }}>
          {error}
        </p>
      ) : (
        <video ref={videoRef} muted playsInline style={{ width: "100%", borderRadius: 12 }} />
      )}
      <button type="button" className="btn ghost sm" onClick={stop}>
        Cancel
      </button>
    </div>
  );
}
