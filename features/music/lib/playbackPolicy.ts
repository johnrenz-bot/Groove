/**
 * Playback failure policy for the rehearsal music player.
 *
 * Deliberately pure — no React, no DOM, no YouTube. The YouTube IFrame Player
 * API reports failures as an integer `onError` code, and deciding "is this
 * permanent, can the user watch it elsewhere, and which track should we try
 * next" is real logic worth testing without a browser or a real video.
 *
 * The bug this module exists to prevent: the old handler called `playNext()`
 * from inside a `useCallback(..., [])`, so it held a first-render closure whose
 * `activePlaylist` was still `null`. The UI said "Skipping to next rehearsal
 * track…" and then skipped nothing. Keeping the decision here — and having the
 * context ask for it — makes that class of bug impossible to reintroduce.
 */

/* --- YouTube IFrame Player error codes -------------------------------------
   2   invalid parameter value (malformed / unusable video id)
   5   HTML5 player error — the stream could not be played
   100 video not found: deleted, made private, or region-blocked
   101 the owner does not allow playback on other websites (embedding off)
   150 the same as 101; YouTube's legacy code for embedding-disabled
   Anything else is treated as unknown and skipped rather than retried forever. */
export type PlaybackErrorKind = 'embed-restricted' | 'unavailable' | 'transient' | 'unknown';

export interface PlaybackErrorInfo {
  kind: PlaybackErrorKind;
  /** Banner copy for the dock. */
  message: string;
  /**
   * True only when the video is public and merely refuses to embed — i.e. when
   * sending the user to youtube.com actually helps. For a deleted or private
   * video (100) there is nothing to open, so we do not offer it.
   */
  openOnYouTube: boolean;
  /** True when retrying the SAME track shortly is worth one attempt. */
  retryable: boolean;
}

const MESSAGES: Record<PlaybackErrorKind, string> = {
  'embed-restricted': 'This rehearsal track can’t be embedded here. Skipping to the next one…',
  unavailable: 'That rehearsal track is unavailable. Skipping to the next one…',
  transient: 'Playback stalled. Retrying this track…',
  unknown: 'Couldn’t play that track. Skipping to the next one…',
};

export function classifyPlaybackError(rawCode: unknown): PlaybackErrorInfo {
  const code = typeof rawCode === 'number' ? rawCode : Number(rawCode);

  switch (code) {
    case 101:
    case 150:
      return {
        kind: 'embed-restricted',
        message: MESSAGES['embed-restricted'],
        openOnYouTube: true,
        retryable: false,
      };
    case 100:
      // Deleted / private / region-blocked. Nothing to open, nothing to retry.
      return { kind: 'unavailable', message: MESSAGES.unavailable, openOnYouTube: false, retryable: false };
    case 2:
      // A malformed id will never resolve. Skip it.
      return { kind: 'unavailable', message: MESSAGES.unavailable, openOnYouTube: false, retryable: false };
    case 5:
      // Most often a network hiccup or a codec the browser cannot take.
      // Worth one quick retry before giving up on the track.
      return { kind: 'transient', message: MESSAGES.transient, openOnYouTube: false, retryable: true };
    default:
      return { kind: 'unknown', message: MESSAGES.unknown, openOnYouTube: false, retryable: false };
  }
}

/* --- Skip planning ---------------------------------------------------------- */

export type SkipAction =
  | { type: 'skip'; index: number }
  | { type: 'stop'; reason: 'exhausted' | 'empty-playlist' };

export interface PlanSkipOptions {
  /** Ids in playlist order. Duplicates are tolerated. */
  trackIds: readonly string[];
  /** Index of the track that just failed; -1 when it is not in the playlist. */
  currentIndex: number;
  /**
   * Ids already tried during this automatic-skip run. This is the ONLY loop
   * guard: a track that has failed is never retried until the user picks a
   * track themselves, which resets the set.
   */
  attempted: ReadonlySet<string>;
  isShuffle: boolean;
  /** Injected for deterministic tests. */
  random?: () => number;
}

/**
 * Choose the next track to try, or decide that there is nothing left to try.
 *
 * The scan is bounded by the playlist length and never revisits an attempted
 * id, so it cannot cycle — including when repeat is `all`, which the normal
 * next-track path uses to wrap to the top. Wrapping is correct when the user
 * presses Next, and wrong here: re-trying a track that just 101'd would loop
 * forever, which is precisely the failure this replaces.
 */
export function planSkip(options: PlanSkipOptions): SkipAction {
  const { trackIds, attempted, isShuffle } = options;
  const n = trackIds.length;
  if (n === 0) return { type: 'stop', reason: 'empty-playlist' };

  const rand = options.random ?? Math.random;

  if (isShuffle && n > 1) {
    // Start at a random offset and walk the whole playlist in rotation, so the
    // order stays unpredictable while the scan is still provably finite.
    const offset = Math.floor(rand() * n);
    for (let i = 0; i < n; i += 1) {
      const index = (offset + i) % n;
      if (!attempted.has(trackIds[index])) return { type: 'skip', index };
    }
    return { type: 'stop', reason: 'exhausted' };
  }

  // The failing track is not in this playlist (a stale or hand-picked track):
  // scan from the top rather than pretending it sits at -1.
  if (options.currentIndex < 0) {
    for (let index = 0; index < n; index += 1) {
      if (!attempted.has(trackIds[index])) return { type: 'skip', index };
    }
    return { type: 'stop', reason: 'exhausted' };
  }

  // Sequential: start just after the failed track and wrap exactly once.
  // The final candidate is the failed track itself, which is in `attempted`,
  // so it can never be selected.
  const start = options.currentIndex;
  for (let i = 1; i <= n; i += 1) {
    const index = (start + i) % n;
    if (!attempted.has(trackIds[index])) return { type: 'skip', index };
  }
  return { type: 'stop', reason: 'exhausted' };
}

export const MESSAGES_FOR = MESSAGES;