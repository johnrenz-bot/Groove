'use client';

import React from 'react';
import { FaqTeaser } from './FaqTeaser';

/**
 * The FAQ BLOCK on the landing page — heading plus teaser in one component.
 *
 * WHY THIS IS SEPARATE FROM `FaqTeaser`
 *   `app/page.tsx` is a server component that composes one child per section.
 *   Every other entry in that list carries its own `<section>` and heading, so
 *   the page reads as a list of sections rather than a page with one inline
 *   exception in it. Putting the heading here keeps `app/page.tsx` uniform and
 *   means the section can be moved or removed by deleting one line.
 *
 * THE HEADING IS HAND-WRITTEN, NOT `SectionHeader`
 *   Disciplines, AudienceTabs, HowItWorks and FinalCta all set their own
 *   `ld-eyebrow` / `ld-h2` / `ld-p`. Using the shared `SectionHeader` here would
 *   make this the only section on the page in a different type scale, which is
 *   exactly the "collection of parts" feel the page is trying to avoid.
 *
 * NO `<Reveal>` HERE — AND THAT IS A DELIBERATE CHOICE
 *   `Reveal` hides its children at `opacity: 0` and relies on a CSS transition
 *   to bring them back. It is fine on a page that needs it, but NO other
 *   section on `/` uses it: Hero, Disciplines, AudienceTabs, HowItWorks,
 *   StudiosPreview and FinalCta all render plainly. Two reasons not to add it
 *   here:
 *
 *     1. Consistency. A scroll-triggered entrance on one section out of seven
 *        makes that section feel like it belongs to a different page.
 *     2. Correctness. The reveal's visible state is only reached once the
 *        transition actually runs. In a throttled or backgrounded renderer the
 *        transition never advances and the section sits at opacity 0 — invisible
 *        to a sighted visitor while still present for a screen reader. Real
 *        content is not worth a cosmetic entrance animation.
 *
 *   If a reveal is ever wanted on this page it should be applied to the whole
 *   page at once, not to one section.
 *
 * PLACEMENT
 *   Between `StudiosPreview` and `FinalCta`. A visitor who has scrolled the
 *   whole page meets the objections — what is this, which account do I need, how
 *   do I sign in — immediately before the closing ask, with the full list one
 *   click away.
 *
 * STYLING
 *   Deliberately plain `ld-section`, with no background treatment of its own:
 *   the page alternates its bands by section, and giving the FAQ a private
 *   surface would break that rhythm. The cards inside come from the existing
 *   `.faq-*` layer, which is token-driven and follows Light/Dark like the rest
 *   of the page.
 *
 * SECTION ID
 *   `#faq` is the anchor the `/faq` empty state links back to, so it must not be
 *   renamed without updating that link.
 */
export function FaqTeaserSection() {
  return (
    <section id="faq" className="ld-section" aria-labelledby="faq-heading">
      <div className="ld-wrap">
        <div className="flex flex-col gap-3">
          <p className="ld-eyebrow">Need to know</p>
          <h2 id="faq-heading" className="ld-h2">
            Questions, answered
          </h2>
          <p className="ld-p max-w-2xl">
            The things people ask before they make an account &mdash; and one link to every
            answer we have.
          </p>
        </div>

        <div className="mt-14">
          <FaqTeaser />
        </div>
      </div>
    </section>
  );
}

export default FaqTeaserSection;
