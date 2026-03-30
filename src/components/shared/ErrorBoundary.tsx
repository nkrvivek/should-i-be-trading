import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "40vh",
          padding: 32,
          fontFamily: "var(--font-mono)",
          color: "var(--text-secondary)",
          textAlign: "center",
          gap: 16,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--warning)" }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 400 }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: "8px 20px",
              background: "var(--accent-bg)",
              color: "var(--accent-text)",
              border: "none",
              borderRadius: 4,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            RETRY
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
