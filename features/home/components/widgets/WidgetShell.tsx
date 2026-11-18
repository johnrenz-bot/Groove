'use client';

/**
 * Per-widget isolation for the home dashboards.
 *
 * Two rules from the brief, in one file:
 *   1. A failing widget must never break the page. That is what the error
 *      boundary is for — the rest of the dashboard keeps working, and the
 *      broken cell shows a way back (Retry) instead of a blank hole.
 *   2. Each widget ships its own skeleton, shaped like its final layout.
 */

import React from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';

interface ErrorBoundaryProps {
  title: string;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  retryKey: number;
}

export class WidgetErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, retryKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[dashboard widget] ${this.props.title} failed:`, error, info.componentStack);
  }

  private reset = () => {
    this.setState((current) => ({ error: null, retryKey: current.retryKey + 1 }));
  };

  render() {
    const { error, retryKey } = this.state;
    if (error) {
      return (
        <div
          role="alert"
          className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-danger/40 bg-card p-6 text-center"
        >
          <AlertCircle className="h-6 w-6 text-danger" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">{this.props.title} could not load</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              The rest of your dashboard is unaffected. Try again, or come back later.
            </p>
          </div>
          <button
            type="button"
            onClick={this.reset}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      );
    }
    // `retryKey` remounts the subtree on Retry so stateful children start clean.
    return <React.Fragment key={retryKey}>{this.props.children}</React.Fragment>;
  }
}

/** Skeleton shown by Suspense while a lazy widget streams in. */
export function WidgetSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading widget"
      className={`rounded-2xl border border-border bg-card p-5 ${tall ? 'min-h-[260px]' : 'min-h-[160px]'}`}
    >
      <div className="g-skeleton h-3 w-32" />
      <div className="g-skeleton mt-4 h-8 w-24" />
      <div className="g-skeleton mt-4 h-3 w-full" />
      <div className="g-skeleton mt-2 h-3 w-2/3" />
    </div>
  );
}

/** Suspense + error boundary, the two things every widget gets for free. */
export function WidgetBoundary({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <WidgetErrorBoundary title={title}>
      <React.Suspense fallback={<WidgetSkeleton tall />}>
        {children}
      </React.Suspense>
    </WidgetErrorBoundary>
  );
}

