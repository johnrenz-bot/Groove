'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

/** Champagne gold gradient — the one gradient in the product. Accent is
 *  token-driven, so it tracks the global theme (dark carbon / cream light). */
export const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ loading, icon, trailingIcon, children, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'group inline-flex items-center justify-center gap-2 rounded-full border border-accent-border px-5 py-3 text-sm font-bold text-accent-foreground',
          'bg-gradient-to-r from-[var(--accent-hover)] to-[var(--accent)] shadow-[var(--shadow-accent)]',
          'transition-all duration-200 hover:from-[var(--accent-hover)] hover:to-[var(--accent-hover)] hover:shadow-[var(--shadow-accent)] hover:-translate-y-px',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:pointer-events-none disabled:opacity-50 active:translate-y-0',
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children}
        {trailingIcon && !loading && (
          <span className="shrink-0 transition-transform duration-200 group-hover:translate-x-1">{trailingIcon}</span>
        )}
      </button>
    );
  }
);

GradientButton.displayName = 'GradientButton';

export default GradientButton;

