import React from 'react';
import { StudioLocator } from '@/components/studio/StudioLocator';

/**
 * Studios section on the public landing page.
 *
 * This is intentionally the same interactive locator the client and coach
 * dashboards use: it owns the Leaflet map, radius/centre controls, curated
 * studio data and the nearby-results drawer. The landing page used to print a
 * six-card preview here instead, which duplicated the data but none of the
 * interactions.
 */
export function StudiosPreview() {
  return (
    <section id="studios" className="ld-section ld-band" aria-label="Studio locator">
      <div className="ld-wrap">
        <StudioLocator
          title="Studios Near You"
          subtitle="Verified rehearsal spaces in San Jose del Monte, Bulacan. Filter by distance, move the centre, or use your location to find nearby studios."
        />
      </div>
    </section>
  );
}

export default StudiosPreview;
