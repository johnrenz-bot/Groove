'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/components/shared/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Pill (default) for chips and inline actions, or the 8px control radius. */
  pill?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  /** Icon rendered after the label */
  trailingIcon?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Height ladder, re-based against the 14px root in `app/globals.css`.
 *
 * `sm` was `h-8`, which is 2rem — 32px at the old 16px root but 28px at the new
 * one, i.e. below the minimum hit target. The three steps are now:
 *
 *     sm     2.375rem  33.25px
 *     md     2.5rem    35px
 *     lg     2.75rem   38.5px
 *
 * `lg` was `h-12` (48px, now 42px); dropping it a step keeps the same
 * sm < md < lg ordering inside the 32-40px band instead of letting the primary
 * CTA tower over the rest of the form. Label sizes follow `text-xs` / `text-sm`
 * (12.25px / 13.1px), which the same root change re-based in `@theme`.
 */
const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-[2.375rem] px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
  icon: 'h-10 w-10 p-0',
};

/**
 * Every variant is token-driven — swapping `light` on <html> restyles all of
 * them. `primary` is Unity Blue and nothing else in the set introduces a hue;
 * `danger` is the one exception and it is Relief Red.
 *
 * Destructive buttons paint `--danger-solid`, NOT `--danger`. In dark mode
 * `--danger` is a lightened red chosen for AA *text* contrast, which would be
 * unusable as a fill with a light label. `--danger-solid` is the brand red in
 * both themes and carries cream at 5.6:1 either way.
 *
 * Hover is a 1px lift and a touch more shadow — present, not animated. Buttons
 * do not scale on hover: a control that grows reads as a link, and this
 * application has links.
 */
const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-foreground shadow-[var(--shadow-sm)] hover:bg-accent-hover hover:shadow-[var(--shadow-accent)] hover:-translate-y-px active:translate-y-0',
  secondary:
    'btn-glass text-foreground hover:-translate-y-px active:translate-y-0',
  outline:
    'bg-transparent text-foreground border border-border hover:bg-muted hover:border-border-strong hover:-translate-y-px active:translate-y-0',
  ghost:
    'bg-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground hover:-translate-y-px active:translate-y-0',
  danger:
    'bg-[var(--danger-solid)] text-[var(--danger-foreground)] shadow-[var(--shadow-sm)] hover:brightness-110 hover:-translate-y-px active:translate-y-0',
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
  const radius = pill ? 'rounded-full' : 'rounded-[8px]';

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
