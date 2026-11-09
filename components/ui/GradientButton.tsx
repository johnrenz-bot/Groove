'use client';

import React from 'react';
import { cn } from '@/components/shared/cn';

export interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ loading, icon, trailingIcon, children, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'group inline-flex items-center justify-center gap-2 rounded-[12px] px-5 py-3 text-sm font-semibold text-black',
          'bg-gradient-to-r from-[#f4be4d] to-[#e5af40] shadow-[0_0_30px_rgba(244,190,77,0.35)]',
          'transition-all duration-200 hover:from-[#e5af40] hover:to-[#d9a43a] hover:shadow-[0_0_40px_rgba(244,190,77,0.45)] hover:-translate-y-px',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4be4d] focus-visible:ring-offset-2 focus-visible:ring-offset-black',
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
