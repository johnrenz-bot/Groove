'use client';

import React from 'react';
import { cn } from '@/components/shared/cn';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article' | 'aside';
  hover?: boolean;
  glow?: boolean;
  radius?: 'card' | 'panel';
  children?: React.ReactNode;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      as: Component = 'div',
      hover = true,
      glow = false,
      radius = 'card',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const radiusClass = radius === 'panel' ? 'rounded-[28px]' : 'rounded-[24px]';
    return (
      <Component
        ref={ref}
        className={cn(
          'relative overflow-hidden border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] shadow-[var(--glass-shadow)] transition-all duration-200',
          radiusClass,
          hover && 'hover:border-[var(--glass-border-hover)] hover:-translate-y-px',
          glow && 'shadow-[0_0_44px_rgba(245,138,24,0.22)]',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;

