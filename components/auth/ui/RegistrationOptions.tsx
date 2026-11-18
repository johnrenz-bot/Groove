'use client';

import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { cn } from '@/components/shared/cn';

/* ==========================================================================
   OPTION CONTROLS
   --------------------------------------------------------------------------
   Row-shaped selectable cards (role, discipline, payment mode) and the chip
   multiselect used for genres. Both are controlled: the page owns the value.
   ========================================================================== */

export function OptionRow({
  title,
  description,
  icon: Icon,
  selected,
  onSelect,
  disabled,
  meta,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ElementType;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn('rw-option', selected && 'is-selected', className)}
    >
      {Icon ? (
        <span className="rw-option-icon" aria-hidden="true">
          <Icon className="h-[18px] w-[18px]" />
        </span>
      ) : null}

      <span className="rw-option-copy">
        <span className="rw-option-title">{title}</span>
        {description ? <span className="rw-option-desc">{description}</span> : null}
        {meta ? <span className="rw-option-meta">{meta}</span> : null}
      </span>

      <span className="rw-option-trail" aria-hidden="true">
        {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <ArrowRight className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}

export function ChipSelect({
  options,
  selected,
  onToggle,
  ariaLabel,
  extra,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  ariaLabel?: string;
  extra?: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="rw-chips" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            className={cn('rw-chip', isSelected && 'is-selected')}
            aria-pressed={isSelected}
            onClick={() => onToggle(option)}
          >
            <AnimatePresence initial={false}>
              {isSelected ? (
                <motion.span
                  className="rw-chip-check"
                  initial={reduceMotion ? false : { width: 0, opacity: 0, scale: 0.6 }}
                  animate={{ width: 14, opacity: 1, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { width: 0, opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  aria-hidden="true"
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </motion.span>
              ) : null}
            </AnimatePresence>
            <span>{option}</span>
          </button>
        );
      })}
      {extra}
    </div>
  );
}

