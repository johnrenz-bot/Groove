'use client';

/**
 * Talent (circle) selection for the Showcase.
 *
 * THE CONSTRAINT THIS ENCODES
 *   RLS does not let a member post into a circle they do not belong to:
 *
 *     CREATE POLICY "Members create posts in their own community" ...
 *     WITH CHECK (author_id = auth.uid() AND talent = public.my_community())
 *
 *   So selection has two distinct jobs, and conflating them is how the old UI
 *   ended up offering a control whose other options were guaranteed to fail on
 *   save:
 *
 *     selectedTalent  -> which circle the FEED is filtered to. Always allowed.
 *     memberTalent    -> which circle a NEW POST is written to. Never a choice.
 *
 *   The selector therefore changes what you browse, and the composer keeps
 *   posting to your own circle, saying so plainly when they differ.
 */

import { useCallback, useMemo, useState } from 'react';

import type { Community } from '@/features/community/utils/community';
import { bannerFor, talentKeyFor, type TalentKey } from '../config/talentBanners';

export interface UseTalentSelectionArgs {
  /** The signed-in member's own canonical community, or null if unset. */
  memberCommunity: Community | null | undefined;
  /** Optional starting circle; defaults to the member's own. */
  initialKey?: TalentKey | null;
}

export interface TalentSelection {
  /** Circle the feed is filtered to. Never null once a member community exists. */
  selectedKey: TalentKey | null;
  /** The circle a new post will be written to — the member's own, always. */
  postKey: TalentKey | null;
  /** True when browsing a circle other than your own. */
  isBrowsingOther: boolean;
  select: (key: TalentKey) => void;
  /** The banner config for the current selection. */
  banner: ReturnType<typeof bannerFor> | null;
}

export function useTalentSelection({
  memberCommunity,
  initialKey,
}: UseTalentSelectionArgs): TalentSelection {
  const memberKey = useMemo(() => talentKeyFor(memberCommunity), [memberCommunity]);

  // Seeded from the member's own circle. `initialKey` is only a fallback for a
  // member with no community yet; it never overrides a real one.
  const [overrideKey, setOverrideKey] = useState<TalentKey | null>(initialKey ?? null);

  const selectedKey = memberKey ?? overrideKey;

  const select = useCallback((key: TalentKey) => setOverrideKey(key), []);

  return useMemo(
    () => ({
      selectedKey,
      postKey: memberKey,
      isBrowsingOther: memberKey !== null && selectedKey !== memberKey,
      select,
      banner: selectedKey ? bannerFor(selectedKey) : null,
    }),
    [selectedKey, memberKey, select]
  );
}