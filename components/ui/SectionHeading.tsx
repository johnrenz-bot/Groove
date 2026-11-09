'use client';

import React from 'react';
import { cn } from '@/components/shared/cn';

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className = '',
}: SectionHeadingProps) {
  return (
    <div className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f4be4d]">{eyebrow}</p>
      )}
      <h2 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)' }}>{title}</h2>
      {description && (
        <p className="mt-4 text-base text-white/60">{description}</p>
      )}
    </div>
  );
}

export default SectionHeading;
