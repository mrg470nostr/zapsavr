import { useNavigate } from "react-router-dom";

export function RoleSelect() {
  const navigate = useNavigate();

  return (
    <div className="wrap">
      <div className="screen center">
        <div className="spacer" />
        <div className="stack" style={{ alignItems: "center" }}>
          <span className="eyebrow">Bitcoin Amantikir</span>
          <h1>
            Welcome to <span className="gold">ZapSavr</span>
          </h1>
          <p className="lede" style={{ maxWidth: 340 }}>
            A safe way to give your kid real money to save and spend, that you control.
          </p>
        </div>

        <div className="stack" style={{ width: "100%", marginTop: 24 }}>
          <button className="opt" onClick={() => navigate("/parent")}>
            <span className="ico">🧑‍🤝‍🧑</span>
            <span className="t">
              <b>I'm a parent</b>
              <span>Connect your wallet and set an allowance</span>
            </span>
          </button>
          <button className="opt" onClick={() => navigate("/kid")}>
            <span className="ico">🧒</span>
            <span className="t">
              <b>I'm a kid</b>
              <span>Save toward something you want</span>
            </span>
          </button>
        </div>
        <div className="spacer" />
        <p className="small center">Built for Santo Antonio do Pinhal, and every community like it.</p>
      </div>
    </div>
  );
}
