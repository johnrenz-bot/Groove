import React from 'react';
import Image from 'next/image';
import { MapPin, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Studio {
  id: string;
  name: string;
  discipline: string;
  location: string;
  distance: string;
  image: string;
  rating: number;
  review_count: number;
  features: string[];
  verified: boolean;
}

interface Coach {
  id: string;
  name: string;
  discipline: string;
  avatar: string;
  rating: number;
  review_count: number;
  verified: boolean;
  location: string;
  specialties: string[];
}

/**
 * Server component to fetch real studios and coaches data.
 * Returns empty arrays if tables don't exist or queries fail.
 */
async function getStudiosPreviewData(): Promise<{ studios: Studio[]; coaches: Coach[] }> {
  const supabase = createClient();

  let studios: Studio[] = [];
  let coaches: Coach[] = [];

  try {
    // Try to fetch studios if table exists
    const { data: studioData, error: studioError } = await supabase
      .from('studios')
      .select('*')
      .eq('status', 'active')
      .limit(3);

    if (!studioError && studioData) {
      studios = studioData as Studio[];
    }
  } catch {
    // Studios table doesn't exist or query failed
    studios = [];
  }

  try {
    // Try to fetch coaches from profiles with role='coach'
    const { data: coachData, error: coachError } = await supabase
      .from('profiles')
      .select('id, firstname, lastname, role, photo_url, bio, location')
      .eq('role', 'coach')
      .eq('status', 'active')
      .limit(4);

    if (!coachError && coachData) {
      coaches = coachData.map((profile: { id: string; firstname: string; lastname: string; photo_url: string | null; bio: string | null; location: string | null }) => ({
        id: profile.id,
        name: `${profile.firstname} ${profile.lastname}`.trim(),
        discipline: 'Coach',
        avatar: profile.photo_url || '/image/placeholder-coach.jpg',
        rating: 0,
        review_count: 0,
        verified: true,
        location: profile.location || 'San Jose del Monte',
        specialties: [],
      })) as Coach[];
    }
  } catch {
    coaches = [];
  }

  return { studios, coaches };
}

/**
 * A rating row that shows nothing rather than "0 (0)".
 *
 * Both the studio and coach records this section reads carry `rating: 0` until
 * a real review exists, and "0 (0)" reads as a badly-reviewed business rather
 * than as an absence of reviews.
 */
function Rating({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  if (!rating || !reviewCount) return null;

  return (
    <p className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--foreground)]">
      <Star className="h-3.5 w-3.5 fill-[var(--brand-sunburst)] text-[var(--brand-sunburst)]" aria-hidden="true" />
      <span className="tabular-nums">{rating.toFixed(1)}</span>
      <span className="text-[var(--subtle-foreground)]">({reviewCount})</span>
    </p>
  );
}

function StudioCard({ studio }: { studio: Studio }) {
  return (
    <li>
      <article className="ld-card h-full overflow-hidden">
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <Image
            src={studio.image}
            alt={studio.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
          {studio.verified && <span className="ld-ribbon">Verified</span>}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-6">
          <p className="ld-small inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {studio.location}
            {studio.distance && <span className="text-[var(--subtle-foreground)]">· {studio.distance}</span>}
          </p>

          <h3 className="ld-h3">{studio.name}</h3>
          <p className="text-sm text-[var(--muted-foreground)]">{studio.discipline}</p>

          <Rating rating={studio.rating} reviewCount={studio.review_count} />

          {studio.features.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {studio.features.slice(0, 3).map((feature) => (
                <li key={feature} className="ld-chip">
                  {feature}
                </li>
              ))}
              {studio.features.length > 3 && (
                <li className="ld-chip ld-chip--quiet">+{studio.features.length - 3} more</li>
              )}
            </ul>
          )}

          <a href="#" className="ld-btn2 ld-btn2--sm mt-auto w-full">
            View studio details
          </a>
        </div>
      </article>
    </li>
  );
}

function CoachCard({ coach }: { coach: Coach }) {
  return (
    <li>
      <article className="ld-card h-full overflow-hidden">
        <div className="relative mx-6 mt-6 aspect-square overflow-hidden rounded-xl">
          <Image
            src={coach.avatar}
            alt={coach.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
          {coach.verified && <span className="ld-ribbon">Verified</span>}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-6">
          <h3 className="ld-h3">{coach.name}</h3>
          <p className="ld-small inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {coach.location}
          </p>

          <Rating rating={coach.rating} reviewCount={coach.review_count} />

          <a href="#" className="ld-btn2 ld-btn2--sm mt-auto w-full">
            View profile
          </a>
        </div>
      </article>
    </li>
  );
}

function EmptyNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="ld-card px-6 py-12 text-center">
      <p className="ld-h4">{title}</p>
      <p className="ld-small mt-1">{body}</p>
    </div>
  );
}

export async function StudiosPreview() {
  const { studios, coaches } = await getStudiosPreviewData();

  return (
    <section id="studios" className="ld-section ld-band" aria-labelledby="studios-heading">
      <div className="ld-wrap">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="flex max-w-xl flex-col gap-3">
            <p className="ld-eyebrow">Studios &amp; Coaches</p>
            <h2 id="studios-heading" className="ld-h2">
              Spaces to create, mentors to guide
            </h2>
            <p className="ld-p">
              Curated rehearsal studios and verified coaches near San Jose del Monte. Filter
              by discipline, capacity, and distance.
            </p>
          </div>
          <a href="#" className="ld-btn2 ld-btn2--sm shrink-0">
            View all studios &amp; coaches
          </a>
        </div>

        {/* Studios */}
        <div className="mt-14">
          {studios.length > 0 ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {studios.map((studio) => (
                <StudioCard key={studio.id} studio={studio} />
              ))}
            </ul>
          ) : (
            <EmptyNote
              title="Studio listings coming soon."
              body="We are curating rehearsal spaces across San Jose del Monte."
            />
          )}
        </div>

        {/* Coaches */}
        <div className="mt-20">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div className="flex max-w-xl flex-col gap-2">
              <p className="ld-eyebrow">Featured coaches</p>
              <h3 className="ld-h2">Verified coaches ready to mentor you</h3>
            </div>
            <a href="#" className="ld-btn2 ld-btn2--sm shrink-0">
              View all coaches
            </a>
          </div>

          <div className="mt-10">
            {coaches.length > 0 ? (
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {coaches.map((coach) => (
                  <CoachCard key={coach.id} coach={coach} />
                ))}
              </ul>
            ) : (
              <EmptyNote
                title="Verified coaches coming soon."
                body="Coaches are being reviewed and will appear here once verified."
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default StudiosPreview;