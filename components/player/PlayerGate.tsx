'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getPlayerEngine } from '@/features/music/engine/engine';
import { usePlayerVisible } from '@/hooks/usePlayerVisible';
import { MiniPlayer } from '@/components/player/MiniPlayer';

/**
 * The one and only music player host.
 *
 * Mounted exactly once (root layout). Renders nothing unless the current
 * route is in the allowlist (`config/player-routes.ts`). When leaving an
 * allowed route it pauses playback and persists the session; returning does
 * NOT auto-resume — the user resumes with a tap/click, matching the
 * "no autoplay" rule.
 */
export function PlayerGate() {
  const visible = usePlayerVisible();
  const pathname = usePathname();

  useEffect(() => {
    if (visible) return;
    const engine = getPlayerEngine();
    engine.pause();
  }, [visible, pathname]);

  if (!visible) return null;
  return <MiniPlayer />;
}

export default PlayerGate;

