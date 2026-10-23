'use client';

import React from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
import { Reveal } from '@/components/shared/Reveal';

/**
 * The four disciplines — redesigned with a staggered asymmetric grid.
 *
 * Desktop: 2-col asymmetric grid (one tall left card, two stacked right).
 * The first card is visually dominant (spans 2 rows), establishing hierarchy.
 * Tablet / mobile: single column.
 *
 * Categories and genre tags are sourced from the project's skills configuration
 * and the capstone survey data (152 respondents, SJDM Bulacan, 2025).
 * Images reuse existing verified assets; no fabricated photography.
 */

const disciplines = [
  {
    title: 'Dance & Choreography',
    tagline: 'Hip-Hop to Ballet',
    image: '/image/wc/dance.jpg',
    description:
      'Connect with expert choreographers and dancers specializing in Hip-Hop, Contemporary, Ballet, Ballroom, K-Pop, and traditional folk dances.',
    highlights: [
      'Solo & Group Choreography',
      'Rehearsal Preparation',
      'Technique Refinement',
      'Audition Coaching',
    ],
    genres: ['Hip-Hop', 'Contemporary', 'Ballet', 'Ballroom', 'K-Pop', 'Folk'],
    featured: true,
  },
  {
    title: 'Vocal Performance & Coaching',
    tagline: 'Pop to Musical Theater',
    image: '/image/wc/singg.png',
    description:
      'Train your vocals across Pop, R&B, Classical, Acoustic, and Musical Theater with experienced vocal coaches.',
    highlights: [
      'Breath Control & Range',
      'Pitch Precision',
      'Stage Presence & Mic Technique',
      'Harmony & Arrangement',
    ],
    genres: ['Pop', 'R&B', 'Classical', 'Acoustic', 'Musical Theater'],
    featured: false,
  },
  {
    title: 'Acting & Stage Craft',
    tagline: 'Method to screen presence',
    image: '/image/wc/acting.jpg',
    description:
      'Learn method acting, improvisation, audition preparation, and screen presence from accomplished theatre and TV artists.',
    highlights: [
      'Character Development',
      'Script Analysis',
      'Monologue Coaching',
      'Camera & Screen Techniques',
    ],
    genres: ['Method Acting', 'Improv', 'Audition Prep', 'Screen Acting', 'Voice Work'],
    featured: false,
  },
  {
    title: 'Theater & Production',
    tagline: 'Stagecraft & direction',
    image: '/image/wc/theater.jpg',
    description:
      'Immerse yourself in full stagecraft, musical theater production, stage management, and performance directing.',
    highlights: [
      'Musical Theater Execution',
      'Stage Direction',
      'Collaborative Ensembles',
      'Live Show Discipline',
    ],
    genres: ['Musical Theater', 'Stage Management', 'Directing', 'Production Design'],
    featured: false,
  },
];

export function Disciplines() {
  return (
    <section id="disciplines" className="ld-section" aria-labelledby="disciplines-heading">
      <div className="ld-wrap">
        {/* Section header */}
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <p className="ld-eyebrow">Disciplines</p>
          <h2 id="disciplines-heading" className="ld-h2">
            Every performing art has a home here
          </h2>
          <p className="ld-p">
            From hip-hop to ballet, vocal coaching to stage direction — four disciplines,
            dozens of genres, one platform.
          </p>
        </Reveal>

        {/* Staggered asymmetric grid */}
        <div className="mt-10 ld-disciplines-grid">
          {disciplines.map((discipline, idx) => (
            <Reveal
              key={discipline.title}
              variant={idx === 0 ? 'up' : idx % 2 === 0 ? 'left' : 'right'}
              delay={idx * 70}
              className={discipline.featured ? 'ld-disciplines-featured' : ''}
            >
              <article className="ld-media h-full group transition-transform duration-300 hover:-translate-y-1">
                <Image
                  src={discipline.image}
                  alt=""
                  fill
                  sizes={
                    discipline.featured
                      ? '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px'
                      : '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px'
                  }
                  className="ld-media__img transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <span className="ld-media__scrim" aria-hidden="true" />

                {/* Culture accent stripe */}
                <div
                  className="absolute top-0 left-0 right-0 h-0.5 pointer-events-none"
                  aria-hidden="true"
                  style={{
                    background:
                      'linear-gradient(to right, transparent, rgba(201,162,74,0.7) 30%, rgba(201,162,74,0.7) 70%, transparent)',
                    opacity: 0,
                    transition: 'opacity 300ms ease',
                  }}
                />

                <div className="ld-media__body">
                  {/* Tagline */}
                  <p className="ld-tagline">{discipline.tagline}</p>
                  <h3 className="ld-h3">{discipline.title}</h3>

                  {discipline.featured && (
                    <p className="ld-copy mt-2">{discipline.description}</p>
                  )}

                  {/* Genre pills */}
                  <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Genres">
                    {discipline.genres.slice(0, discipline.featured ? 6 : 4).map((genre) => (
                      <li key={genre} className="ld-pill-glass inline-flex items-center gap-1.5 px-2.5 py-1">
                        <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                        {genre}
                      </li>
                    ))}
                    {discipline.genres.length > (discipline.featured ? 6 : 4) && (
                      <li className="ld-pill-glass ld-pill-glass--quiet inline-flex items-center gap-1.5 px-2.5 py-1">
                        +{discipline.genres.length - (discipline.featured ? 6 : 4)} more
                      </li>
                    )}
                  </ul>

                  {/* Highlights — only for featured on mobile */}
                  <ul className={`mt-3 flex flex-col gap-1.5 pt-2 border-t border-white/10 ${discipline.featured ? '' : 'hidden sm:flex'}`}>
                    {discipline.highlights.slice(0, discipline.featured ? 4 : 2).map((highlight) => (
                      <li
                        key={highlight}
                        className="inline-flex items-start gap-2 text-[13px] text-white/75"
                      >
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Disciplines;