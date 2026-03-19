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
        background: "#2F373B",
        padding: 24,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        <div style={{
          maxWidth: 400,
          width: "100%",
          background: "#3A444A",
          borderRadius: 16,
          padding: "36px 28px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>😵‍💫</div>
          <h2 style={{
            color: "#E8EAEC",
            fontSize: 18,
            fontWeight: 700,
            margin: "0 0 10px",
          }}>
            Something went wrong
          </h2>
          <p style={{
            color: "#9AA3A9",
            fontSize: 13,
            lineHeight: 1.6,
            margin: "0 0 24px",
          }}>
            Feedbox hit an unexpected error. Reloading usually fixes it.
          </p>

          <button
            onClick={this.handleReload}
            style={{
              background: "#65D5C4",
              color: "#1A2B28",
              border: "none",
              borderRadius: 10,
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
              <summary style={{ color: "#6B757B", fontSize: 11, cursor: "pointer" }}>
                Error details
              </summary>
              <pre style={{
                color: "#9AA3A9",
                fontSize: 10,
                background: "#2F373B",
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
