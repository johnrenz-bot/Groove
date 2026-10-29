import React from 'react';
import { StudioLocator } from '@/components/studio/StudioLocator';

/**
 * Studios section on the public landing page.
 *
 * This is intentionally the same interactive locator the client and coach
 * dashboards use: it owns the Google Map, address/radius/location controls,
 * Supabase + curated studio data, and the nearby-results drawer. The landing
 * page used to print a six-card preview here instead, which duplicated the data
 * but none of the interactions.
 */
export function StudiosPreview() {
  return (
    <section id="studios" className="ld-section ld-band" aria-label="Studio locator">
      <div className="ld-wrap">
        <StudioLocator />
      </div>
    </section>
  );
}

export default StudiosPreview;
