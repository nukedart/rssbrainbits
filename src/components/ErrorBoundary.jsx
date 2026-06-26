import { Component } from "react";

/**
 * App-level error boundary — catches render crashes and shows
 * a friendly recovery screen instead of a white page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // Inline styles so this works even if CSS fails to load
    return (
      <div style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#121416",
        padding: 24,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
      }}>
        <div style={{
          maxWidth: 400,
          width: "100%",
          background: "#1a1c1e",
          borderRadius: 16,
          padding: "36px 28px",
          textAlign: "center",
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c2c8bf" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <h2 style={{
            color: "#f1f1f1",
            fontSize: 18,
            fontWeight: 700,
            margin: "0 0 10px",
          }}>
            Something went wrong
          </h2>
          <p style={{
            color: "#c2c8bf",
            fontSize: 13,
            lineHeight: 1.6,
            margin: "0 0 24px",
          }}>
            Feedbox hit an unexpected error. Reloading usually fixes it.
          </p>

          <button
            onClick={this.handleReload}
            style={{
              background: "#accfae",
              color: "#03210b",
              border: "none",
              borderRadius: 6,
              padding: "12px 28px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              width: "100%",
              marginBottom: 12,
            }}
          >
            Reload Feedbox
          </button>

          {this.state.error && (
            <details style={{ textAlign: "left", marginTop: 12 }}>
              <summary style={{ color: "#737971", fontSize: 11, cursor: "pointer" }}>
                Error details
              </summary>
              <pre style={{
                color: "#c2c8bf",
                fontSize: 10,
                background: "#121416",
                borderRadius: 8,
                padding: 10,
                marginTop: 8,
                overflow: "auto",
                maxHeight: 120,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
