'use client';

/**
 * The global click sound.
 *
 * ONE sound, ONE engine, ONE listener. This module owns the audio; components
 * never touch an <audio> element and never call play() themselves.
 *
 * WHY A SINGLE CAPTURE-PHASE LISTENER INSTEAD OF PER-COMPONENT HANDLERS
 *   The alternative — sprinkling onClick handlers, or wrapping every Button, Link
 *   and custom control — has three failure modes this avoids outright:
 *
 *     1. Coverage. Interactive elements exist in every shell: the header, three
 *        dashboards, modals, tabs, dropdowns, cards, signature pads. A
 *        component-level hook only fires on the components someone remembered to
 *        wrap, so the sound would be inconsistent by exactly the measure of the
 *        developer's attention.
 *     2. Duplication. A click on an <svg> inside a <button> fires the inner
 *        element's handler AND bubbles to the outer one. Per-component handlers
 *        therefore double-play unless every one of them calls
 *        stopPropagation(), which would break nested interactive elements — a
 *        link inside a clickable card is a legal, common pattern.
 *
 *   A single listener on `document`, in the CAPTURE phase, resolves both. The
 *   capture phase runs exactly once per event, on the way down, before any
 *   component handler runs and regardless of how deeply nested the target is.
 *   By the time it fires, `event.target` is the exact innermost element, which
 *   is precisely what "is this interactive?" needs to answer. We never call
 *   stopPropagation, so nothing else about the click changes.
 *
 * AUTOPLAY POLICY
 *   Browsers refuse to play audio before a user gesture. Creating an
 *   AudioContext before any gesture leaves it 'suspended' and the first
 *   play() is silently dropped. So the context is created LAZILY, inside the
 *   first genuine user gesture, and resumed if the browser suspended it. The
 *   result: no console autoplay warnings, and the very first click is audible.
 *
 * THE SOUND
 *   ONE deep, bass-heavy mechanical clack for every interaction in the app,
 *   synthesised by scripts/generate-click-sound.mjs and committed as
 *   public/sounds/click.wav. Never layered, never swapped.
 *
 *   Four layers inside a single 140 ms transient:
 *     - BODY      a 108 Hz fundamental with a 214 Hz partial, decaying slowest
 *                 of anything in the mix. This is the weight, and it is what you
 *                 feel at the end of the sound.
 *     - LOW METAL inharmonic partials at 742 / 1057 / 1889 Hz for the mechanical
 *                 "clack". Capped below 2 kHz on purpose: energy above that reads
 *                 as a bright tick or a squeak rather than as weight.
 *     - GRIT      8 ms of band-passed noise in the low mids — the rock rasp.
 *     - TRANSIENT a short, restrained contact spike. Kept small deliberately; a
 *                 bright spike on the front is what makes a clack sound cheap.
 *
 *   Measured with a Goertzel transform over the committed file: 96% of the
 *   energy is at or below 500 Hz, 81% sits on the fundamental, and nothing above
 *   2.5 kHz is measurable. That is the audible claim — deep, not thin.
 *
 *   The sum is soft-clipped rather than limited, because saturation lifts the low
 *   harmonics fastest, which is what makes the attack sound driven.
 *
 *   The generator lives in version control alongside the asset so the sound is
 *   reproducible and auditable: regenerating it yields a byte-identical file
 *   (verified by hash), and its provenance needs no external licence.
 *
 * PERFORMANCE
 *   The clip is ~12 KB and fully decoded before it is ever needed, so playback is
 *   a buffer swap rather than a fetch. Three Audio elements are kept and
 *   round-robinned: re-triggering ONE element inside its 140 ms window restarts
 *   the sample instead of layering, which is audible as a stutter on fast
 *   repeated clicks.
 */

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

/** Where the clip lives. Served from /public, so no bundler involvement. */
export const CLICK_SOUND_SRC = '/sounds/click.wav';

/** localStorage key. Namespaced like the theme keys so they never collide. */
export const SOUND_ENABLED_KEY = 'groove-sound-enabled';

/** Cross-tab / cross-component sync, same shape as the theme's event. */
const SOUND_EVENT = 'groove-sound-change';

/**
 * How many pre-built Audio elements to keep.
 *
 * Three is enough that a fast triple-click (or a click whose handler navigates
 * while another fires) never re-enters the same element while it is still
 * playing. More would waste decoded memory for no audible benefit.
 */
const VOICE_COUNT = 3;

/**
 * Elements that are interactive BY ROLE, regardless of tag.
 *
 * `closest()` walks ancestors, so this is what makes an icon inside a button
 * resolve to the button. `contenteditable` and `summary` are included because
 * both are genuinely operable and neither is a button or a link.
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

/**
 * Why a click must not make a sound.
 *
 * Centralised so the rules are stated once and cannot drift between the mouse,
 * keyboard and touch paths.
 */
function isSuppressed(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;

  // A disabled control must not sound. `closest` is used rather than a direct
  // check so a click on an icon inside a disabled button is also suppressed —
  // the icon is not itself disabled, but the control the user aimed at is.
  const control = target.closest(INTERACTIVE_SELECTOR);
  if (!control) return true;

  // The disabled check covers <button disabled>, <fieldset disabled> (which
  // disables all descendants without setting the attribute on them), and
  // aria-disabled for custom controls that only look disabled.
  if ((control as HTMLButtonElement).disabled) return true;
  if (control.getAttribute('aria-disabled') === 'true') return true;
  if (control.closest('fieldset[disabled]')) return true;

  // An anchor with no href is not a link — it is a styled span. Without an href
  // it has no keyboard activation and no navigation, so it is not a control.
  if (control.tagName === 'A' && !control.getAttribute('href')) return true;

  return false;
}

/**
 * Whether the browser has asked for reduced motion.
 *
 * Sound is not motion, so this is NOT applied automatically — a user who wants
 * a silent UI can turn the setting off, and a user who wants a click on a
 * reduced-motion device still gets one. The flag is exposed for the settings
 * copy, which mentions it.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ------------------------------------------------------------------ */
/* The engine                                                          */
/* ------------------------------------------------------------------ */

/**
 * Module-level so the audio graph is created once per page, not once per
 * component that happens to mount. A hook that built its own <audio> elements
 * would create a second set every time a second consumer mounted.
 */
interface Engine {
  context: AudioContext | null;
  voices: HTMLAudioElement[];
  next: number;
  unlocked: boolean;
}

let engine: Engine = { context: null, voices: [], next: 0, unlocked: false };

/** Reset hook — only for tests. Exported narrowly so nothing in the app calls it. */
export function __resetSoundEngineForTests() {
  engine.context?.close?.().catch(() => {});
  engine.voices.forEach((v) => {
    v.pause();
    v.src = '';
  });
  engine = { context: null, voices: [], next: 0, unlocked: false };
}

/**
 * Build the audio graph. Called from inside a user gesture the first time.
 *
 * Catching construction failures is not defensive noise: `Audio` and
 * `AudioContext` are absent in some embedded webviews and in server rendering,
 * and an unguarded `new Audio()` would throw on every click in those
 * environments rather than merely staying silent.
 */
function ensureEngine(): Engine {
  if (engine.voices.length > 0) return engine;

  if (typeof window === 'undefined') return engine;

  try {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ??
      // Safari < 14.1 and some iOS webviews only expose the prefixed name.
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (Ctor) {
      engine.context = new Ctor();
    }

    for (let i = 0; i < VOICE_COUNT; i += 1) {
      const audio = new Audio(CLICK_SOUND_SRC);
      audio.preload = 'auto';
      /* Deliberately not louder than a UI sound should be.

         The clip is normalised to -1.5 dBFS, but because 96% of its energy is
         under 500 Hz it is subjectively far more powerful than that number
         implies — low frequencies are perceived as heavier, and on laptop
         speakers the 108 Hz fundamental is reproduced far more strongly than a
         mid-range click of the same peak. 0.34 is the point where it reads as
         solid and satisfying rather than as something that startles you on a
         fast click, and it still leaves clear headroom under a playing video.

         It is 140 ms, not a sustained tone, so it cannot fatigue at this level
         the way an equally loud tone would. */
      audio.volume = 0.34;
      engine.voices.push(audio);
    }
  } catch {
    // No audio support: the click simply makes no sound, which is the correct
    // degradation. The rest of the app is untouched.
  }

  return engine;
}

/**
 * Unblock playback, and report whether this is the very first gesture.
 *
 * MUST be called from inside a user-gesture handler the first time: that is the
 * only moment a browser will let a context move to 'running'. A context created
 * suspended and never resumed silently drops every play(), which looks
 * identical to "the sound is broken" and is the single most common way click
 * sounds ship dead.
 *
 * NOTE WHAT IS NOT HERE: there is deliberately no separate silent "warm-up"
 * play(). An earlier version nudged a voice at volume 0 to mark the element
 * user-activated, which meant the FIRST click a user ever made produced no
 * sound and the second one did — the most noticeable possible off-by-one. The
 * gesture that unlocks the context is the same gesture that plays the click, so
 * the very first click is the first sound.
 *
 * Returns `true` on the first call so the caller knows this is the unlocking
 * gesture.
 */
function unlock(): boolean {
  const e = ensureEngine();
  const wasLocked = !e.unlocked;

  if (e.context && e.context.state === 'suspended') {
    void e.context.resume().catch(() => {});
  }
  e.unlocked = true;
  return wasLocked;
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
 * Play the click. Returns whether a sound was actually attempted, which the
 * tests use to prove the suppression rules rather than inferring it.
 */
export function playClick(): boolean {
  if (!readEnabled()) return false;

  const e = ensureEngine();
  // No Audio support in this environment: silent, but nothing else breaks.
  if (e.voices.length === 0) return false;

  // The context can still be suspended on the very first call, if the resume()
  // in unlock() has not settled yet. It is resumed again here so the FIRST click
  // is not the one that gets silently dropped — the alternative (waiting for the
  // context to report 'running') would cost the user their first click.
  if (e.context && e.context.state === 'suspended') {
    void e.context.resume().catch(() => {});
  }

  const voice = e.voices[e.next % e.voices.length];
  e.next += 1;

  try {
    voice.currentTime = 0;
    const p = voice.play();
    if (p && typeof p.catch === 'function') {
      // Autoplay refusal or a decode failure. Swallowed deliberately: a failed
      // sound must never surface as an unhandled rejection or a console error
      // the user cannot act on.
      p.catch(() => {});
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
 * Install the global listener. Mounted ONCE, from the root layout.
 *
 * Mounting it anywhere else would mean several listeners, each of which would
 * play — the exact duplicate-audio bug this design exists to prevent. The
 * settings toggle therefore does NOT call this; it uses `useSoundPreference`,
 * which only reads and writes the flag.
 */
export function useGlobalClickSound(): void {
  // Mirrors the stored flag for the listener, so the listener never has to
  // close over a stale value or be re-subscribed when the setting changes.
  const enabledRef = useRef(true);

  useEffect(() => {
    enabledRef.current = readEnabled();

    // Another tab (or the settings toggle) changing the setting. The listener
    // only needs the flag, so it updates a ref rather than state — no re-render
    // and no stale closure.
    const onChange = () => {
      enabledRef.current = readEnabled();
    };
    window.addEventListener('storage', onChange);
    window.addEventListener(SOUND_EVENT, onChange);

    /* ── The one listener ──────────────────────────────────────────────────
       Capture phase, on `document`. One listener for the whole app: every
       control, every route, every nesting depth. */
    const onPointerActivation = (event: Event) => {
      // The FIRST real interaction of any kind unlocks the audio context, which
      // is what every browser requires and cannot be done any earlier.
      if (!engine.unlocked) unlock();

      if (!enabledRef.current) return;
      if (isSuppressed(event.target)) return;

      playClick();
    };

    /* Three activation paths, three reasons:
       - pointerup: the natural "the press completed" signal. pointerdown would
         fire for a press the user then drags away from, which is not a click.
       - keydown: Enter and Space activate a control from the keyboard, and both
         fire keydown. Held-key auto-repeat is filtered below.
       - touchend: iOS Safari does not synthesise pointer events for some
         gestures, so touchend is also subscribed. The dedupe below collapses it
         with the pointerup that modern iOS fires alongside. */
    /* ONE dedupe window shared by every activation path, not one per path.

       Modern mobile fires touchend AND pointerup for a single tap, and the two
       arrive microseconds apart. A guard that only compared touch against touch
       would let both through, so a tap — the single most common interaction on
       the platform — would play twice. The window is shared and keyed on the
       TARGET as well as the time, so it collapses a touch/pointer pair for one
       control while still allowing a fast, genuine double-click on two
       different controls (or even the same one) to sound twice, which is what a
       double-click actually is. */
    const DEDUPE_MS = 60;
    let lastAt = 0;
    let lastTarget: EventTarget | null = null;

    const activate = (event: Event) => {
      const now = Date.now();
      const target = event.target;

      // Same control, inside the window => the same physical action seen twice.
      if (target === lastTarget && now - lastAt < DEDUPE_MS) return;
      lastAt = now;
      lastTarget = target;

      onPointerActivation(event);
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
    // touchend is also subscribed. The shared window above is what keeps it
    // from doubling on devices that fire both.
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
 * This is what the settings toggle uses. It deliberately does not call
 * `useGlobalClickSound`, because a second copy of that hook would mean a second
 * set of document listeners — and every click would then play twice, once per
 * listener. Reading the flag is free; listening is not.
 */
export function useSoundPreference(): { enabled: boolean; setEnabled: (on: boolean) => void } {
  /* `useSyncExternalStore` rather than `useState` + a mount effect that seeds
     it. The seed pattern is a setState in an effect body (a cascading render on
     every mount) AND it renders once with the wrong value before correcting
     itself, so the switch would visibly flip from on to off for a frame when a
     user who disabled sounds opened Settings.

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
