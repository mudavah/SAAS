"use client";

import { Component, type ReactNode } from "react";
import { captureError } from "@/lib/error-monitoring";

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Static fallback node, or a render function receiving the error + reset. */
  fallback?:
    | ReactNode
    | ((error: Error, reset: () => void) => ReactNode);
  /** Optional extra context added to the captured error. */
  context?: Record<string, unknown>;
  /** Called after the error is captured (e.g. to report to analytics). */
  onError?: (error: Error, info: { componentStack: string }) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React error boundary for catching render-time errors in client components.
 * On catch it records the error (with component stack) through the centralized
 * error monitor and renders a recoverable fallback.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    void captureError(error, {
      source: "react-error-boundary",
      componentStack: info.componentStack,
      ...this.props.context,
    });
    this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;
      if (typeof fallback === "function") {
        return fallback(this.state.error, this.reset);
      }
      if (fallback !== undefined) return fallback;

      return (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <p className="font-medium text-destructive">Something went wrong.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            An unexpected error occurred while rendering this section.
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
