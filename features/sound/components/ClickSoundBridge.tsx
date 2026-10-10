'use client';

import { useGlobalClickSound } from '../useGlobalClickSound';

/**
 * Mounts the global click sound, once, from the root layout.
 *
 * The same reasoning as <PresenceBridge>: the click sound has to work on every
 * route — the dashboards, the public pages, /messages, /login — and those are
 * rendered by four different shells. Mounting it in any one shell would leave it
 * silent on the others, and mounting it in more than one would play the sound
 * once per shell.
 *
 * Renders nothing.
 */
export function ClickSoundBridge() {
  useGlobalClickSound();
  return null;
}

export default ClickSoundBridge;
