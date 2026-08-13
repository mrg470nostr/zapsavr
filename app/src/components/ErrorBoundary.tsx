import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

// Without this, any uncaught render error is a blank white screen — a
// genuinely bad failure mode for a kid or a parent mid-payment. React error
// boundaries have to be class components; there's no hook equivalent.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("ZapSavr crashed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="wrap">
          <div className="screen center">
            <div className="spacer" />
            <div className="stack" style={{ alignItems: "center" }}>
              <span style={{ fontSize: 40 }}>😵</span>
              <h2>Something went wrong</h2>
              <p className="lede" style={{ maxWidth: 320 }}>
                Your sats are safe — this app never holds them, your wallet does. Just reload and try again.
              </p>
              <button className="btn" onClick={() => window.location.reload()}>
                Reload
              </button>
            </div>
            <div className="spacer" />
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
