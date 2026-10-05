'use client';

import React from 'react';
import { cn } from './cn';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article' | 'aside';
  hover?: boolean;
  glow?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Shared GlassCard component for modern frosted-glass surfaces.
 * Utilizes semantic CSS variables defined in `globals.css` with automatic
 * reduced-transparency and reduced-motion fallback.
 */
export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      as: Component = 'div',
      hover = true,
      glow = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Component
        ref={ref}
        className={cn(
          'glass rounded-[20px] transition-all duration-200',
          hover && 'glass-hover',
          glow && 'hover:shadow-[0_0_24px_-4px_var(--accent-soft)]',
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
