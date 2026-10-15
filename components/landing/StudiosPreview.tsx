import React from 'react';
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

interface StudioCardProps {
  studio: Studio;
  index: number;
}

function StudioCard({ studio, index }: StudioCardProps) {
  return (
    <article className="g-card relative overflow-hidden rounded-2xl transition-all duration-500 hover:border-[#C9A24A]/30 hover:shadow-[0_0_30px_rgba(201,162,74,0.2)] group">
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={studio.image}
          alt={studio.name}
          className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute top-3 right-3 flex gap-2">
          {studio.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
              Verified
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
          <span>{studio.location}</span>
          <span className="text-white/40">•</span>
          <span>{studio.distance}</span>
        </div>

        <h3 className="text-lg font-bold tracking-tight text-white">{studio.name}</h3>
        <p className="mt-1 text-sm text-white/60">{studio.discipline}</p>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm font-medium text-white">
            <span>{studio.rating}</span>
            <span className="text-white/40">({studio.review_count})</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {studio.features.slice(0, 3).map((feature) => (
            <span key={feature} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-white/70">
              {feature}
            </span>
          ))}
          {studio.features.length > 3 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-white/50">
              +{studio.features.length - 3} more
            </span>
          )}
        </div>

        <a
          href="#"
          className="mt-5 inline-flex items-center gap-2 w-full justify-center rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold text-white/80 transition-all hover:border-[#C9A24A]/50 hover:bg-white/[0.05] hover:text-white"
        >
          View studio details
        </a>
      </div>
    </article>
  );
}

interface CoachCardProps {
  coach: Coach;
  index: number;
}

function CoachCard({ coach, index }: CoachCardProps) {
  return (
    <article className="g-card flex flex-col overflow-hidden rounded-2xl transition-all duration-500 hover:border-[#C9A24A]/30 hover:shadow-[0_0_30px_rgba(201,162,74,0.2)] group">
      <div className="relative aspect-square overflow-hidden">
        <img
          src={coach.avatar}
          alt={coach.name}
          className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute top-3 right-3">
          {coach.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
              Verified
            </span>
          )}
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
          <span>{coach.location}</span>
        </div>

        <h3 className="text-lg font-bold tracking-tight text-white">{coach.name}</h3>
        <p className="mt-1 text-sm text-white/60">{coach.discipline}</p>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm font-medium text-white">
            <span>{coach.rating}</span>
            <span className="text-white/40">({coach.review_count})</span>
          </div>
        </div>

        <div className="mt-auto pt-4 flex flex-wrap gap-2">
          {coach.specialties.map((specialty) => (
            <span key={specialty} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-white/70">
              {specialty}
            </span>
          ))}
        </div>

        <a
          href="#"
          className="mt-5 inline-flex items-center gap-2 w-full justify-center rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold text-white/80 transition-all hover:border-[#C9A24A]/50 hover:bg-white/[0.05] hover:text-white"
        >
          View profile
        </a>
      </div>
    </article>
  );
}

function StudiosEmpty() {
  return (
    <div className="text-center py-16">
      <p className="text-white/60 text-lg mb-4">Studio listings coming soon.</p>
      <p className="text-white/40 text-sm">We are curating rehearsal spaces across San Jose del Monte.</p>
    </div>
  );
}

function CoachesEmpty() {
  return (
    <div className="text-center py-16">
      <p className="text-white/60 text-lg mb-4">Verified coaches coming soon.</p>
      <p className="text-white/40 text-sm">Coaches are being reviewed and will appear here once verified.</p>
    </div>
  );
}

export async function StudiosPreview() {
  const { studios, coaches } = await getStudiosPreviewData();

  return (
    <section id="studios" className="g-section mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8 sm:py-32">
      <div className="flex flex-col items-center justify-between gap-8 mb-14 sm:flex-row">
        <div className="text-center sm:text-left max-w-2xl">
          <p className="gl-hero-badge inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm mb-6">
            Studios & Coaches
          </p>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Spaces to create, mentors to guide
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
            Curated rehearsal studios and verified coaches near San Jose del Monte. Filter by discipline, capacity, and distance.
          </p>
        </div>
        <a
          href="#"
          className="inline-flex items-center gap-2 shrink-0 rounded-full border border-white/20 bg-transparent px-6 py-3 text-sm font-semibold text-white/80 transition-all hover:border-[#C9A24A]/50 hover:bg-white/[0.05] hover:text-white"
        >
          View all studios & coaches
        </a>
      </div>

      {/* Studios Grid */}
      {studios.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-16">
          {studios.map((studio, index) => (
            <StudioCard key={studio.id} studio={studio} index={index} />
          ))}
        </div>
      ) : (
        <div className="mb-16">
          <StudiosEmpty />
        </div>
      )}

      {/* Featured Coaches */}
      <div>
        <div className="flex flex-col items-center justify-between gap-8 mb-8 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="gl-hero-badge inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm mb-4">
              Featured Coaches
            </p>
            <h3 className="font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Verified coaches ready to mentor you
            </h3>
          </div>
          <a
            href="#"
            className="inline-flex items-center gap-2 shrink-0 rounded-full border border-white/20 bg-transparent px-6 py-3 text-sm font-semibold text-white/80 transition-all hover:border-[#C9A24A]/50 hover:bg-white/[0.05] hover:text-white"
          >
            View all coaches
          </a>
        </div>

        {coaches.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {coaches.map((coach, index) => (
              <CoachCard key={coach.id} coach={coach} index={index} />
            ))}
          </div>
        ) : (
          <CoachesEmpty />
        )}
      </div>
    </section>
  );
}

export default StudiosPreview;