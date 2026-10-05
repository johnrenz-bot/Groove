'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/components/shared/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Pill (default, SaaS-minimalism signature) or 12px radius */
  pill?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  /** Icon rendered after the label */
  trailingIcon?: React.ReactNode;
  children?: React.ReactNode;
}

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3.5 text-xs gap-1.5',
  md: 'h-10 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-[0.9375rem] gap-2.5',
  icon: 'h-10 w-10 p-0',
};

/**
 * Every variant is token-driven — swapping `light` on <html> restyles all of
 * them. `primary` is the single Groove-orange accent; nothing else is colored.
 */
const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-foreground shadow-[var(--shadow-sm)] hover:bg-accent-hover hover:shadow-[var(--shadow-accent)] hover:-translate-y-0.5 active:translate-y-0',
  secondary:
    'btn-glass text-foreground hover:-translate-y-0.5 active:translate-y-0',
  outline:
    'bg-transparent text-foreground border border-border hover:bg-muted hover:border-border-strong hover:-translate-y-0.5 active:translate-y-0',
  ghost: 'bg-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground hover:-translate-y-0.5 active:translate-y-0',
  danger: 'bg-danger text-white hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0',
  link: 'bg-transparent text-accent-text hover:underline underline-offset-4 px-0 h-auto',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    pill = true,
    loading = false,
    disabled = false,
    icon,
    trailingIcon,
    children,
    className = '',
    type = 'button',
    ...props
  },
  ref
) {
  const radius = pill ? 'rounded-full' : 'rounded-xl';

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'group inline-flex select-none items-center justify-center font-semibold tracking-[-0.01em] whitespace-nowrap cursor-pointer transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
        variant === 'link' ? '' : radius,
        variant === 'link' ? '' : SIZE_STYLES[size],
        VARIANT_STYLES[variant],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
      {trailingIcon && !loading && (
        <span className="shrink-0 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none">
          {trailingIcon}
        </span>
      )}
    </button>
  );
});

export default Button;
