'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface OutlineButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

/** Border-forward ghost control: 1px hairline, quiet surface, dark or cream. */
export const OutlineButton = React.forwardRef<HTMLButtonElement, OutlineButtonProps>(
  ({ loading, icon, trailingIcon, children, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'group inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card/60 px-5 py-3 text-sm font-semibold text-foreground backdrop-blur-[12px]',
          'transition-all duration-200 hover:border-accent-border hover:bg-accent-soft hover:text-accent-text hover:-translate-y-px',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:pointer-events-none disabled:opacity-50 active:translate-y-0',
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-border-strong border-t-foreground" />
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

OutlineButton.displayName = 'OutlineButton';

export default OutlineButton;

