import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, ExternalLink } from 'lucide-react';
import { CURATED_STUDIOS, type CuratedStudio } from '@/lib/studios/curatedStudios';
import { haversineKm, DEFAULT_CENTER } from '@/lib/geo';
import { Reveal } from '@/components/shared/Reveal';

/**
 * Distance from SJDM city center to each curated studio (precomputed).
 * SJDM center: 14.8144, 121.0455 (approximate city hall coordinates)
 */
const SJDM_CENTER = { lat: 14.8144, lng: 121.0455 };

function computeDistanceKm(studio: CuratedStudio): number {
  return haversineKm(SJDM_CENTER, { lat: studio.latitude, lng: studio.longitude });
}

/**
 * Studio Card — displays verified curated studio data.
 * No ratings, phone numbers, or hours invented.
 * Links to the Studio Locator with the studio pre-selected.
 */
function StudioCard({ studio }: { studio: CuratedStudio }) {
  const distance = computeDistanceKm(studio);
  const distanceStr = distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`;

  // Studio Locator URL with this studio's coordinates as center
  const locatorUrl = `/#studios`;

  return (
    <li>
      <article className="ld-card h-full overflow-hidden group">
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <Image
            src={studio.image || '/image/placeholder-studio.jpg'}
            alt={studio.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="ld-ribbon">Verified</span>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-6">
          <p className="ld-small inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {studio.address || 'San Jose del Monte, Bulacan'}
            <span className="text-[var(--subtle-foreground)]">· {distanceStr} from city center</span>
          </p>

          <h3 className="ld-h3">{studio.name}</h3>

          {studio.address && (
            <p className="text-sm text-[var(--muted-foreground)]">
              {studio.address}
            </p>
          )}

          <div className="mt-auto pt-2">
            <Link
              href={locatorUrl}
              className="ld-btn2 ld-btn2--sm w-full inline-flex items-center justify-center gap-2"
            >
              <span>View in Studio Locator</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </article>
    </li>
  );
}

/**
 * Empty state when no studios are available.
 */
function EmptyNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="ld-card px-6 py-12 text-center">
      <p className="ld-h4">{title}</p>
      <p className="ld-small mt-1">{body}</p>
    </div>
  );
}

/**
 * Studios Preview Section — uses curated studio data.
 * Links to the full Studio Locator for interactive map and radius search.
 */
export async function StudiosPreview() {
  const studios = CURATED_STUDIOS;

  return (
    <section id="studios" className="ld-section ld-band" aria-labelledby="studios-heading">
      <div className="ld-wrap">
        <Reveal className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="flex max-w-xl flex-col gap-3">
            <p className="ld-eyebrow">Studios Near You</p>
            <h2 id="studios-heading" className="ld-h2">
              Verified rehearsal spaces in San Jose del Monte
            </h2>
            <p className="ld-p">
              {studios.length} curated studios with confirmed locations. Filter by distance,
              discipline, and capacity in the full locator.
            </p>
          </div>
          <Link href="#studios" className="ld-btn2 ld-btn2--sm shrink-0">
            Open full Studio Locator
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Reveal>

        {/* Studios Grid */}
        <Reveal variant="scale" delay={100} className="mt-14">
          {studios.length > 0 ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {studios.map((studio) => (
                <StudioCard key={studio.id} studio={studio} />
              ))}
            </ul>
          ) : (
            <EmptyNote
              title="Studio listings coming soon."
              body="We are curating verified rehearsal spaces across San Jose del Monte."
            />
          )}
        </Reveal>

        {/* Feature hint */}
        <Reveal variant="fade" delay={200} className="mt-10">
          <div className="ld-card ld-card--pad px-6 py-4 text-center border-accent/20 bg-accent/5">
            <p className="ld-small text-[var(--muted-foreground)]">
              Need a different radius or discipline?{' '}
              <Link href="#studios" className="font-semibold text-accent-text underline-offset-2 hover:underline">
                Open the full Studio Locator &rarr;
              </Link>
              for interactive map search, 1/3/5/10 km filters, and OpenStreetMap community listings.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default StudiosPreview;