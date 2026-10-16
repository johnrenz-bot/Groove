'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { FAQ_CATEGORIES, type FaqItem } from '@/lib/faq/faq-data';
import { FaqAccordion } from './FaqAccordion';

/**
 * THE COMPACT FAQ — the landing page's short list.
 *
 * WHY IT IS A SEPARATE COMPONENT AND NOT THE WHOLE PAGE
 *   `/` is a marketing page. A visitor who has not decided whether to make an
 *   account should get five answers that answer the questions blocking that
 *   decision — what is this, what do I get, how do I sign in, why can't I see
 *   the coach area, who do I contact — and one link onward. Putting all forty
 *   answers here would bury the final call to action under a wall of text.
 *
 * THE PICK
 *   These ids are chosen, not sorted. Every one of them is a genuine
 *   blocker-turned-waiter question, and they are spread across five categories
 *   on purpose so the list previews the breadth of /faq rather than five
 *   questions from the same category. `FEATURED_FAQ_IDS` below names them;
 *   an id that is renamed or removed in `faq-data.ts` simply drops out of the
 *   teaser rather than crashing the landing page, which is why the lookup is
 *   filtered instead of asserted.
 */
const FEATURED_FAQ_IDS = [
  'about-what',
  'start-which-account',
  'client-find-coach',
  'directory-what',
  'messages-where',
  'security-redirect',
  'community-access',
  'trouble-still-stuck',
] as const;

export function FaqTeaser() {
  const [openId, setOpenId] = useState<string | null>(null);

  const featured = useMemo<FaqItem[]>(() => {
    const wanted = new Set<string>(FEATURED_FAQ_IDS);
    const found = FAQ_CATEGORIES.flatMap((category) => category.items).filter((item) =>
      wanted.has(item.id)
    );
    // Keep the authored order rather than the data order, so the list can be
    // sequenced for the decision it is supporting.
    return FEATURED_FAQ_IDS.map((id) => found.find((item) => item.id === id)).filter(
      (item): item is FaqItem => Boolean(item)
    );
  }, []);

  return (
    <div className="faq-teaser">
      <FaqAccordion items={featured} openId={openId} onOpenChange={setOpenId} />

      <div className="mt-8 flex justify-center">
        <Link href="/faq" className="faq-btn faq-btn--primary">
          View all {FAQ_CATEGORIES.reduce((total, category) => total + category.items.length, 0)} questions
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export default FaqTeaser;
