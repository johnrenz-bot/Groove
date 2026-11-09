'use client';

import React from 'react';

interface SectionTransitionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  'aria-labelledby'?: string;
  variant?: 'fade-up' | 'fade-in' | 'scale-up' | 'slide-left' | 'slide-right' | 'minimal';
  intensity?: number;
  fadeOut?: boolean;
}

/**
 * SectionTransition - Wrapper for sections with simple reveal animation.
 *
 * Simplified version for TestSprite-inspired design.
 * Uses CSS transition for smooth entrance effects.
 */
export function SectionTransition({
  children,
  className = '',
  id,
  'aria-labelledby': ariaLabelledby,
}: SectionTransitionProps) {
  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledby}
      className={className}
    >
      {children}
    </section>
  );
}

export default SectionTransition;