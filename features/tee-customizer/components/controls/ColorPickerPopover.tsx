'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Pipette, RotateCcw, X } from 'lucide-react';
import { GROOVE_PALETTE } from '../../constants';
import {
  hexToHsv,
  hsvToHex,
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  pushRecentColor,
  readRecentColors,
  clamp01,
  type Hsv,
} from './colorUtils';

interface ColorPickerPopoverProps {
  open: boolean;
  onClose: () => void;
  value: string;
  /** Live updates while dragging or typing. */
  onChange: (hex: string) => void;
  /** The element the popover anchors to. */
  anchorRef: React.RefObject<HTMLElement | null>;
  label?: string;
}

const POPOVER_WIDTH = 236;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Figma-style floating color picker: SV pad, hue slider, HEX/RGB/HSL fields,
 * eyedropper (when the browser supports it), recent swatches and the Groove PH
 * palette. Rendered in a portal with viewport-aware placement.
 */
export function ColorPickerPopover({ open, onClose, value, onChange, anchorRef, label }: ColorPickerPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ top: number; left: number } | null>(null);
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value) ?? { h: 0, s: 0, v: 0 });
  const [hexDraft, setHexDraft] = useState(value.toUpperCase());
  const [recent, setRecent] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState<'sv' | 'hue' | null>(null);
  const [initialValue, setInitialValue] = useState(value);

  // Sync local HSV state from the outside value — but never mid-drag. Achromatic
  // results (zero saturation or value) keep the previous hue so drags through
  // pure grays don't make the hue slider jump. Done during render (React's
  // sanctioned derived-state pattern), not in an effect.
  const [prevExternal, setPrevExternal] = useState(value);
  if (value !== prevExternal) {
    setPrevExternal(value);
    if (!dragging) {
      const parsed = hexToHsv(value);
      if (parsed) {
        setHsv((previous) => ({
          h: parsed.s === 0 || parsed.v === 0 ? previous.h : parsed.h,
          s: parsed.s,
          v: parsed.v,
        }));
      }
      setHexDraft(value.toUpperCase());
    }
  }

  // Capture the value present when the popover opens (for "reset color") and
  // refresh the recent-colors list — also during render.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setInitialValue(value);
      setRecent(readRecentColors());
      setCopied(false);
    }
  }

  const emit = useCallback(
    (hex: string) => {
      onChange(hex);
    },
    [onChange]
  );

  const commit = useCallback(
    (hex: string) => {
      emit(hex);
      setRecent(pushRecentColor(hex));
    },
    [emit]
  );

  const applyHsv = useCallback(
    (next: Hsv, shouldCommit = false) => {
      const normalized = { h: next.h, s: clamp01(next.s), v: clamp01(next.v) };
      setHsv(normalized);
      const hex = hsvToHex(normalized);
      setHexDraft(hex.toUpperCase());
      if (shouldCommit) commit(hex);
      else emit(hex);
    },
    [commit, emit]
  );

  const updateFromSvPointer = useCallback(
    (clientX: number, clientY: number) => {
      const pad = svRef.current;
      if (!pad) return;
      const rect = pad.getBoundingClientRect();
      const s = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
      const v = clamp(1 - (clientY - rect.top) / Math.max(1, rect.height), 0, 1);
      applyHsv({ h: hsv.h, s, v });
    },
    [applyHsv, hsv.h]
  );

  // Viewport-aware placement: dock under the anchor, flip above when needed,
  // clamp horizontally, never overflow.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const height = panelRef.current?.offsetHeight ?? 380;
      const margin = 10;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      let top = rect.bottom + 8;
      if (spaceBelow < height + margin && spaceAbove > spaceBelow) {
        top = rect.top - height - 8;
      }
      top = clamp(top, margin, Math.max(margin, window.innerHeight - height - margin));
      let left = rect.right - POPOVER_WIDTH;
      left = clamp(left, margin, window.innerWidth - POPOVER_WIDTH - margin);
      setPlacement({ top, left });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, anchorRef]);

  // Close on outside press and on Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open, onClose, anchorRef]);

  // Global pointer tracking while dragging inside the SV pad or hue slider.
  useEffect(() => {
    if (!dragging) return undefined;
    const onMove = (event: PointerEvent) => {
      if (dragging === 'sv') updateFromSvPointer(event.clientX, event.clientY);
    };
    const onUp = () => {
      setDragging(null);
      commit(hsvToHex(hsv));
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, updateFromSvPointer, commit, hsv]);

  if (!open) return null;

  const rgb = hexToRgb(hsvToHex(hsv)) ?? { r: 0, g: 0, b: 0 };
  const hsl = rgbToHsl(rgb);
  const hueHex = hsvToHex({ h: hsv.h, s: 1, v: 1 });
  const eyeDropper = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>).EyeDropper : undefined;
  const canPick = typeof eyeDropper === 'function';

  const setHexDraftCommit = (raw: string) => {
    setHexDraft(raw);
    const normalized = raw.trim().startsWith('#') ? raw.trim() : `#${raw.trim()}`;
    const parsed = hexToHsv(normalized);
    if (parsed) {
      setHsv(parsed);
      commit(hsvToHex(parsed));
    }
  };

  const setRgbChannel = (channel: 'r' | 'g' | 'b', raw: string) => {
    const parsed = clamp(Number(raw) || 0, 0, 255);
    const next = { ...rgb, [channel]: parsed };
    const nextHex = rgbToHex(next);
    const nextHsv = hexToHsv(nextHex);
    if (nextHsv) setHsv(nextHsv);
    commit(nextHex);
  };

  const setHslChannel = (channel: 'h' | 's' | 'l', raw: string) => {
    const maxValue = channel === 'h' ? 360 : 100;
    const parsed = clamp(Number(raw) || 0, 0, maxValue);
    const next = hslToRgb({ h: channel === 'h' ? parsed : hsl.h, s: channel === 's' ? parsed : hsl.s, l: channel === 'l' ? parsed : hsl.l });
    const nextHex = rgbToHex(next);
    const nextHsv = hexToHsv(nextHex);
    if (nextHsv) setHsv(nextHsv);
    commit(nextHex);
  };

  const copyHex = async () => {
    const hex = hsvToHex(hsv).toUpperCase();
    try {
      await navigator.clipboard.writeText(hex);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = hex;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch {
        // Clipboard unavailable; the user can still select the HEX text.
      }
      textarea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const pickWithEyedropper = async () => {
    if (typeof eyeDropper !== 'function') return;
    try {
      const picker = new (eyeDropper as new () => { open: () => Promise<{ sRGBHex: string }> })();
      const result = await picker.open();
      const parsed = hexToHsv(result.sRGBHex);
      if (parsed) {
        setHsv(parsed);
        commit(result.sRGBHex.toLowerCase());
      }
    } catch {
      // The user cancelled the eyedropper; nothing to do.
    }
  };

  const swatchButton = (hexValue: string, name?: string) => (
    <button
      key={hexValue}
      type="button"
      title={name ? `${name} · ${hexValue.toUpperCase()}` : hexValue.toUpperCase()}
      aria-label={name ? `${name} ${hexValue.toUpperCase()}` : `Color ${hexValue.toUpperCase()}`}
      onClick={() => {
        const parsed = hexToHsv(hexValue);
        if (parsed) setHsv(parsed);
        commit(hexValue.toLowerCase());
      }}
      className="h-5 w-5 cursor-pointer rounded-[6px] border border-white/15 transition-transform duration-100 hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crew-accent-gold)]"
      style={{ backgroundColor: hexValue }}
    />
  );

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={label ? `${label} color picker` : 'Color picker'}
      className="fixed z-[120] w-[236px] select-none rounded-2xl border border-white/10 bg-surface p-3  backdrop-blur-xl"
      style={{ top: placement?.top ?? -9999, left: placement?.left ?? -9999, visibility: placement ? 'visible' : 'hidden' }}
    >
      {/* Saturation / value pad */}
      <div
        ref={svRef}
        role="slider"
        tabIndex={0}
        aria-label="Saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.v * 100)}
        aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
        onPointerDown={(event) => {
          event.preventDefault();
          setDragging('sv');
          updateFromSvPointer(event.clientX, event.clientY);
        }}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 0.1 : 0.02;
          if (event.key === 'ArrowLeft') applyHsv({ h: hsv.h, s: hsv.s - step, v: hsv.v });
          else if (event.key === 'ArrowRight') applyHsv({ h: hsv.h, s: hsv.s + step, v: hsv.v });
          else if (event.key === 'ArrowUp') applyHsv({ h: hsv.h, s: hsv.s, v: hsv.v + step });
          else if (event.key === 'ArrowDown') applyHsv({ h: hsv.h, s: hsv.s, v: hsv.v - step });
          else return;
          event.preventDefault();
        }}
        className="relative h-[124px] w-full cursor-crosshair overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crew-accent-gold)]"
        style={{ backgroundColor: hueHex }}
      >
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to right, #ffffff, rgba(255,255,255,0))' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to top, #000000, rgba(0,0,0,0))' }} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white "
          style={{ left: `${hsv.s * 100}%`, bottom: `${hsv.v * 100}%`, backgroundColor: hsvToHex(hsv) }}
        />
      </div>

      {/* Hue slider */}
      <input
        type="range"
        min={0}
        max={360}
        step={1}
        value={Math.round(hsv.h)}
        aria-label="Hue"
        onChange={(event) => applyHsv({ h: Number(event.target.value), s: hsv.s, v: hsv.v })}
        onPointerUp={() => commit(hsvToHex(hsv))}
        onKeyUp={() => commit(hsvToHex(hsv))}
        className="groove-hue mt-2.5 h-3 w-full cursor-pointer appearance-none rounded-full"
        style={{
          backgroundImage:
            'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
        }}
      />

      {/* HEX + actions */}
      <div className="mt-2.5 flex items-center gap-1.5">
        <div className="flex h-8 flex-1 items-center rounded-lg border border-white/10 bg-white/[0.06] px-2 focus-within:border-[var(--crew-accent-gold)]/60">
          <span aria-hidden="true" className="mr-1.5 text-[11px] font-semibold text-white/45">#</span>
          <input
            value={hexDraft.replace(/^#/, '')}
            onChange={(event) => setHexDraftCommit(event.target.value)}
            onBlur={() => commit(hsvToHex(hsv))}
            onKeyDown={(event) => { if (event.key === 'Enter') (event.target as HTMLInputElement).blur(); }}
            spellCheck={false}
            autoComplete="off"
            aria-label="Hex color value"
            className="w-full bg-transparent font-mono text-[12px] uppercase tracking-wider text-white/90 outline-none"
          />
        </div>
        <button
          type="button"
          onClick={copyHex}
          title="Copy HEX"
          aria-label="Copy HEX color"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crew-accent-gold)]"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={pickWithEyedropper}
          disabled={!canPick}
          title={canPick ? 'Eyedropper' : 'Eyedropper is not supported in this browser'}
          aria-label="Pick a color from the screen"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crew-accent-gold)]"
        >
          <Pipette className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => { const parsed = hexToHsv(initialValue); if (parsed) { setHsv(parsed); } commit(initialValue); }}
          title="Reset color"
          aria-label="Reset color to the original value"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crew-accent-gold)]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          aria-label="Close color picker"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crew-accent-gold)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* RGB / HSL fields */}
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {(['r', 'g', 'b'] as const).map((channel) => (
          <label key={channel} className="flex flex-col items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.04] py-1">
            <input
              type="number"
              min={0}
              max={255}
              value={rgb[channel]}
              onChange={(event) => setRgbChannel(channel, event.target.value)}
              aria-label={channel.toUpperCase()}
              className="w-full bg-transparent text-center font-mono text-[12px] text-white/90 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-[9px] font-semibold uppercase tracking-widest text-white/40">{channel}</span>
          </label>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {(['h', 's', 'l'] as const).map((channel) => (
          <label key={channel} className="flex flex-col items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.04] py-1">
            <input
              type="number"
              min={0}
              max={channel === 'h' ? 360 : 100}
              value={channel === 'h' ? hsl.h : channel === 's' ? hsl.s : hsl.l}
              onChange={(event) => setHslChannel(channel, event.target.value)}
              aria-label={channel === 'h' ? 'Hue' : channel === 's' ? 'Saturation' : 'Lightness'}
              className="w-full bg-transparent text-center font-mono text-[12px] text-white/90 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-[9px] font-semibold uppercase tracking-widest text-white/40">{channel}</span>
          </label>
        ))}
      </div>

      {/* Recent colors */}
      {recent.length > 0 && (
        <div className="mt-2.5">
          <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">Recent</div>
          <div className="flex flex-wrap gap-1">{recent.map((hexValue) => swatchButton(hexValue))}</div>
        </div>
      )}

      {/* Groove PH palette */}
      <div className="mt-2.5">
        <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">Groove PH</div>
        <div className="flex flex-wrap gap-1">{GROOVE_PALETTE.map((entry) => swatchButton(entry.value, entry.name))}</div>
      </div>

      <style>{`
        .groove-hue::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 14px;
          width: 14px;
          border-radius: 9999px;
          background: #ffffff;
          border: 2px solid rgba(0, 0, 0, 0.45);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
          cursor: pointer;
        }
        .groove-hue::-moz-range-thumb {
          height: 12px;
          width: 12px;
          border-radius: 9999px;
          background: #ffffff;
          border: 2px solid rgba(0, 0, 0, 0.45);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
          cursor: pointer;
        }
        .groove-hue:focus-visible { outline: 2px solid var(--crew-accent-gold); outline-offset: 2px; }
      `}</style>
    </div>,
    document.body
  );
}

export default ColorPickerPopover;
