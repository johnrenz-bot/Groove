'use client';

/**
 * The global click sound.
 *
 * Laptop Touchpad Click by Lesiakower, Pixabay.
 *
 * ONE sound, ONE engine, ONE listener. This module owns the audio; components
 * never create an Audio object, never touch an <audio> element and never call
 * play() themselves — they only render the preference toggle.
 *
 * WHY A SINGLE CAPTURE-PHASE LISTENER
 *   Interactive elements live in every shell (header, three dashboards, modals,
 *   tabs, dropdowns, cards). Per-component handlers only cover what someone
 *   remembered to wrap, and a click on an <svg> inside a <button> would fire
 *   both handlers unless every one of them stopped propagation. One listener on
 *   `document` in the capture phase fires exactly once per event, before any
 *   component handler, with `event.target` already the innermost element.
 *
 * WHAT MAKES A SOUND (and what does not)
 *   Buttons, switches, tabs, segmented controls, modal/dropdown triggers and
 *   menu items play. Hover, scrolling, typing, page load, disabled controls and
 *   any anchor that performs a navigation stay silent. An action-style anchor
 *   opts in explicitly with `data-click-sound`.
 *
 * AUTOPLAY POLICY
 *   Browsers only allow playback inside a user gesture. The listener runs inside
 *   pointerup / keydown / touchend, so the first genuine click is already the
 *   first sound. Refusals and decode failures are swallowed: a missing file or
 *   blocked autoplay leaves the UI silent, never noisy in the console.
 *
 * PERFORMANCE
 *   One small pool of elements is created once, client-side, and reused. The
 *   asset is preloaded before it is needed, and a round-robin across voices lets
 *   fast clicks overlap instead of restarting a single element. A 60 ms floor on
 *   repeat playback keeps a held key or a burst of synthetic events from
 *   machine-gunning the clip.
 */

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

/** Where the clip lives. Served from /public, so no bundler involvement. */
export const CLICK_SOUND_SRC = '/sounds/click.mp3';

/**
 * The single volume knob. The clip is short and crisp; 0.35 keeps it subtle
 * under speech and video while still reading as feedback.
 */
const CLICK_SOUND_VOLUME = 0.35;

/** localStorage key. Namespaced like the theme keys so they never collide. */
export const SOUND_ENABLED_KEY = 'groove-sound-enabled';

/** Cross-tab / cross-component sync, same shape as the theme's event. */
const SOUND_EVENT = 'groove-sound-change';

/**
 * How many preloaded elements to keep. Three lets a fast triple-click (or a
 * click whose handler navigates while another fires) overlap cleanly without
 * re-entering an element that is still playing.
 */
const VOICE_COUNT = 3;

/** Minimum gap between two starts, so repeats cannot machine-gun the clip. */
const MIN_INTERVAL_MS = 60;

/**
 * Elements that are interactive BY ROLE, regardless of tag.
 *
 * `closest()` walks ancestors, so an icon inside a button resolves to the
 * button. `contenteditable` and `summary` are included because both are
 * genuinely operable and neither is a button or a link.
 */
const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'summary',
  'input',
  'select',
  'textarea',
  'label[for]',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="slider"]',
  '[role="combobox"]',
  '[contenteditable="true"]',
  '[contenteditable=""]',
].join(',');

/** Inputs whose activation means "I am about to type", not "do the thing". */
const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'email',
  'password',
  'number',
  'tel',
  'url',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
]);

/** Whether the target is a text-entry surface, where a click is not an action. */
function isTextEntry(control: Element): boolean {
  if (control.matches('textarea, [contenteditable="true"], [contenteditable=""]')) return true;
  if (!(control instanceof HTMLInputElement)) return false;
  return TEXT_INPUT_TYPES.has((control.getAttribute('type') || 'text').toLowerCase());
}

/**
 * Why a click must not make a sound. Centralised so the rules are stated once
 * and cannot drift between the mouse, keyboard and touch paths.
 */
function isSuppressed(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;

  // `closest` rather than a direct check, so an icon inside a disabled button
  // is suppressed too — the icon is not disabled, the control the user aimed at
  // is.
  const control = target.closest(INTERACTIVE_SELECTOR);
  if (!control) return true;

  // Explicit opt-out. Used by controls that live inside an action-style surface
  // but are not themselves the action (e.g. the perk icon buttons on a role
  // card), so opening their tooltip never adds a second click.
  if (control.closest('[data-click-sound="off"]')) return true;

  // Covers <button disabled>, <fieldset disabled> (which disables descendants
  // without setting the attribute on them), and aria-disabled custom controls.
  if ((control as HTMLButtonElement).disabled) return true;
  if (control.getAttribute('aria-disabled') === 'true') return true;
  if (control.closest('fieldset[disabled]')) return true;

  // A label click only moves focus to its control; it is not an activation.
  if (control.tagName === 'LABEL') return true;

  // Typing is never a click, and selecting text in a field should stay quiet.
  if (isTextEntry(control)) return true;

  // Navigation is not an action. Every anchor that performs a navigation —
  // including internal <Link> CTAs — stays silent. An anchor that only looks
  // like a link but acts like a button opts in with `data-click-sound`.
  if (control.tagName === 'A') {
    if (!control.getAttribute('href')) return true;
    return !control.hasAttribute('data-click-sound');
  }

  return false;
}

/* ------------------------------------------------------------------ */
/* The engine                                                          */
/* ------------------------------------------------------------------ */

/**
 * Module-level so the pool is created once per page, not once per component
 * that happens to mount. No component may create its own Audio object.
 */
let voices: HTMLAudioElement[] = [];
let nextVoice = 0;
let lastPlayedAt = 0;

/** Reset hook — only for tests. Exported narrowly so nothing in the app calls it. */
export function __resetSoundEngineForTests() {
  voices.forEach((voice) => {
    voice.pause();
    voice.src = '';
  });
  voices = [];
  nextVoice = 0;
  lastPlayedAt = 0;
}

/**
 * Build the preloaded pool. Safe to call repeatedly; the browser downloads the
 * asset once and the same response serves every voice.
 *
 * Construction is wrapped because `Audio` is absent in some embedded webviews
 * and during server rendering, and an unguarded constructor would throw on
 * every click rather than merely staying silent.
 */
function ensureVoices(): HTMLAudioElement[] {
  if (typeof window === 'undefined' || typeof window.Audio !== 'function') return [];
  if (voices.length > 0) return voices;

  try {
    for (let i = 0; i < VOICE_COUNT; i += 1) {
      const voice = new Audio(CLICK_SOUND_SRC);
      voice.preload = 'auto';
      voice.volume = CLICK_SOUND_VOLUME;
      voices.push(voice);
    }
  } catch {
    // No audio support: the click simply makes no sound, which is the correct
    // degradation. The rest of the app is untouched.
    voices = [];
  }

  return voices;
}

/** Warm the pool from the client after mount, without touching playback. */
export function preloadClickSound(): void {
  ensureVoices();
}

/** Read the stored preference. Sound is ON unless explicitly turned off. */
function readEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(SOUND_ENABLED_KEY) !== 'off';
  } catch {
    // Private mode: default to on rather than silently disabling the feature.
    return true;
  }
}

/**
 * The one and only way to play the click.
 *
 * Returns whether a sound was actually attempted, which the tests use to prove
 * the suppression rules rather than inferring it.
 */
export function playClick(): boolean {
  if (typeof window === 'undefined') return false;
  if (!readEnabled()) return false;

  // A global floor, not just per target: holding a key or a burst of synthetic
  // events must not turn into a rattle.
  const now = Date.now();
  if (now - lastPlayedAt < MIN_INTERVAL_MS) return false;

  const pool = ensureVoices();
  if (pool.length === 0) return false;

  lastPlayedAt = now;
  const voice = pool[nextVoice % pool.length];
  nextVoice += 1;

  try {
    // Restart this voice rather than layering the same element onto itself;
    // the round-robin above lets genuinely rapid clicks overlap in other
    // voices.
    voice.currentTime = 0;
    const playback = voice.play();
    if (playback && typeof playback.catch === 'function') {
      // Autoplay refusal or a decode failure. Swallowed deliberately: a failed
      // sound must never surface as an unhandled rejection or a console error
      // the user cannot act on.
      playback.catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* React bindings                                                     */
/* ------------------------------------------------------------------ */

/**
 * Install the global listener. Mounted ONCE, from the root layout via
 * <ClickSoundBridge>, so Client, Coach, Admin and public routes all share it.
 *
 * The settings toggle does NOT call this; it uses `useSoundPreference`, which
 * only reads and writes the flag. A second listener would double every sound.
 */
export function useGlobalClickSound(): void {
  // Mirrors the stored flag for the listener, so it never closes over a stale
  // value or re-subscribes when the setting changes.
  const enabledRef = useRef(true);

  useEffect(() => {
    enabledRef.current = readEnabled();

    // Preload the clip once, on the client, before the first click needs it.
    preloadClickSound();

    // Another tab (or the settings toggle) changing the setting. The listener
    // only needs the flag, so it updates a ref — no re-render, no stale closure.
    const onChange = () => {
      enabledRef.current = readEnabled();
    };
    window.addEventListener('storage', onChange);
    window.addEventListener(SOUND_EVENT, onChange);

    const activate = (event: Event) => {
      if (!enabledRef.current) return;
      if (isSuppressed(event.target)) return;
      playClick();
    };

    const onPointerUp = (event: PointerEvent) => {
      // Primary button only: a right-click opens a context menu and is not an
      // activation of the control.
      if (event.button !== 0) return;
      activate(event);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      // Auto-repeat while a key is held would machine-gun the click.
      if (event.repeat) return;
      if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
      activate(event);
    };

    // iOS Safari does not synthesise pointer events for every gesture, so
    // touchend is also subscribed. The 60 ms floor in playClick() collapses the
    // touchend/pointerup pair that modern iOS fires for one tap.
    const onTouchEnd = (event: Event) => {
      activate(event);
    };

    // Capture phase => before any component handler, exactly once per event.
    const CAPTURE = { capture: true, passive: true } as const;

    document.addEventListener('pointerup', onPointerUp, CAPTURE);
    document.addEventListener('keydown', onKeyDown, CAPTURE);
    document.addEventListener('touchend', onTouchEnd, CAPTURE);

    return () => {
      document.removeEventListener('pointerup', onPointerUp, CAPTURE);
      document.removeEventListener('keydown', onKeyDown, CAPTURE);
      document.removeEventListener('touchend', onTouchEnd, CAPTURE);
      window.removeEventListener('storage', onChange);
      window.removeEventListener(SOUND_EVENT, onChange);
    };
  }, []);
}

/**
 * Read and write the preference. NO listener is installed.
 *
 * This is what the settings toggle uses. Reading the flag is free; listening is
 * not, and a second listener would play every click twice.
 */
export function useSoundPreference(): { enabled: boolean; setEnabled: (on: boolean) => void } {
  /* `useSyncExternalStore` rather than `useState` + a mount effect that seeds
     it. The seed pattern is a setState in an effect body AND it renders once
     with the wrong value before correcting itself, so the switch would visibly
     flip from on to off for a frame when a user who disabled sounds opened
     Settings.

     The stored flag IS external state — localStorage, shared across tabs — which
     is exactly what this hook is for. The server snapshot returns `true`, the
     same value a first-time visitor gets, so SSR and hydration agree. */
  const enabled = useSyncExternalStore(subscribePreference, readEnabled, () => true);

  const setEnabled = useCallback((next: boolean) => {
    try {
      if (next) {
        // Removing the key rather than storing 'on' keeps "enabled" the absence
        // of a preference, so a user who has never touched the setting is
        // indistinguishable from one who explicitly turned it back on.
        window.localStorage.removeItem(SOUND_ENABLED_KEY);
      } else {
        window.localStorage.setItem(SOUND_ENABLED_KEY, 'off');
      }
    } catch {
      // Storage blocked (private mode): the preference still applies for this
      // session via the event below.
    }
    // Tells both this hook and the global listener immediately, without waiting
    // for a reload. `emit()` is what makes `useSyncExternalStore` re-read.
    emitPreferenceChange();
  }, []);

  return { enabled, setEnabled };
}

/** Subscribe to preference changes from any source: this tab, or another one. */
function subscribePreference(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  window.addEventListener(SOUND_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(SOUND_EVENT, onChange);
  };
}

/** Notifies every same-tab subscriber that the flag may have changed. */
function emitPreferenceChange() {
  window.dispatchEvent(new Event(SOUND_EVENT));
}

export default useGlobalClickSound;
