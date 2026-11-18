'use client';

import React, { useEffect } from 'react';
import { Check, MapPin, RotateCcw, Tag, Wallet, X } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { DISCIPLINE_OPTIONS, LOCATION_OPTIONS, MAX_FEE, MIN_FEE } from './types';

/**
 * Mobile-only bottom sheet that hosts every directory filter (search stays
 * visible in the bar; this sheet carries the rest). Backdrop click and
 * Escape close it; the sheet scrolls and its actions pin to the safe area.
 */
export function MobileFiltersSheet({
  open,
  onClose,
  discipline,
  setDiscipline,
  location,
  setLocation,
  maxFee,
  setMaxFee,
  onReset,
  resultCount,
  totalCount,
  noun = 'coach',
}: {
  open: boolean;
  onClose: () => void;
  discipline: string;
  setDiscipline: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  maxFee: number;
  setMaxFee: (v: number) => void;
  onReset: () => void;
  resultCount: number;
  totalCount: number;
  noun?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const original = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.documentElement.style.overflow = original;
    };
  }, [open, onClose]);

  if (!open) return null;

  const pct = ((maxFee - MIN_FEE) / (MAX_FEE - MIN_FEE)) * 100;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Directory filters">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close filters"
        className="absolute inset-0 cursor-pointer bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative mt-auto flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl border-t border-white/5 bg-[#161616] shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/10" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3 border-b border-white/5 px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="h-5 w-5 stroke-[1.5]" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-2 pt-4">
          {/* Discipline */}
          <fieldset className="mb-5">
            <legend className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Tag className="h-3 w-3" aria-hidden="true" />
              Discipline
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {DISCIPLINE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = discipline === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setDiscipline(option.id)}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2.5 text-[12px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      selected
                        ? 'border-accent/50 bg-accent-soft/20 text-foreground'
                        : 'border-white/5 bg-white/[0.03] text-muted-foreground hover:border-white/10 hover:text-foreground'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0 stroke-[1.5]', selected ? 'text-accent-text' : 'text-muted-foreground')} aria-hidden="true" />
                    <span className="min-w-0 truncate text-left leading-tight">{option.label}</span>
                    {selected && <Check className="ml-auto h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Location */}
          <fieldset className="mb-5">
            <legend className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              Location
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {LOCATION_OPTIONS.map((option) => {
                const selected = location === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setLocation(option.id)}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2.5 text-[12px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      selected
                        ? 'border-accent/50 bg-accent-soft/20 text-foreground'
                        : 'border-white/5 bg-white/[0.03] text-muted-foreground hover:border-white/10 hover:text-foreground'
                    )}
                  >
                    <MapPin className={cn('h-4 w-4 shrink-0 stroke-[1.5]', selected ? 'text-accent-text' : 'text-muted-foreground')} aria-hidden="true" />
                    <span className="min-w-0 truncate text-left leading-tight">{option.label}</span>
                    {selected && <Check className="ml-auto h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Max fee */}
          <fieldset className="mb-4">
            <legend className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Wallet className="h-3 w-3" aria-hidden="true" />
                Max session fee
              </span>
              <span className="rounded-full bg-accent-soft/25 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-accent-text">
                ₱{maxFee.toLocaleString()}
              </span>
            </legend>
            <input
              type="range"
              min={MIN_FEE}
              max={MAX_FEE}
              step={100}
              value={maxFee}
              onChange={(e) => setMaxFee(Number(e.target.value))}
              aria-label="Maximum session fee"
              aria-valuetext={`₱${maxFee.toLocaleString()}`}
              className="h-2 w-full cursor-pointer appearance-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:border-0 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent"
              style={{
                background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`,
              }}
            />
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-medium tabular-nums text-subtle-foreground">
              <span>₱{MIN_FEE.toLocaleString()}</span>
              <span>₱{MAX_FEE.toLocaleString()}</span>
            </div>
          </fieldset>

          <p className="mt-2 text-[11px] font-medium tabular-nums text-muted-foreground" aria-live="polite">
            Showing <span className="font-semibold text-foreground">{resultCount}</span> of{' '}
            <span className="font-semibold text-foreground">{totalCount}</span> {totalCount === 1 ? noun : `${noun}s`}
          </p>
        </div>

        {/* Actions pinned above the safe area */}
        <div
          className="flex items-center gap-2 border-t border-white/5 bg-[#161616] px-5 py-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-white/5 bg-white/[0.03] text-sm font-semibold text-muted-foreground transition hover:border-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <RotateCcw className="h-4 w-4 stroke-[1.5]" aria-hidden="true" />
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 flex-[2] cursor-pointer items-center justify-center gap-1.5 rounded-2xl bg-accent text-sm font-bold text-accent-foreground shadow-[var(--shadow-sm)] transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Show {resultCount} {totalCount === 1 ? noun : `${noun}s`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MobileFiltersSheet;

