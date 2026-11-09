'use client';

import React from 'react';
import { cn } from '@/components/shared/cn';

export interface OutlineButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const OutlineButton = React.forwardRef<HTMLButtonElement, OutlineButtonProps>(
  ({ loading, icon, trailingIcon, children, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'group inline-flex items-center justify-center gap-2 rounded-[12px] border border-white/12 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur-[20px]',
          'transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:-translate-y-px',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
          'disabled:pointer-events-none disabled:opacity-50 active:translate-y-0',
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
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
