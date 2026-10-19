'use client';

import React from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
import { Reveal } from '@/components/shared/Reveal';

/**
 * The four disciplines, as a four-up card grid (wraps to 2 on tablet, 1 on mobile).
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
  },
];

export function Disciplines() {
  return (
    <section id="disciplines" className="ld-section" aria-labelledby="disciplines-heading">
      <div className="ld-wrap">
        {/* Section head: eyebrow, heading, lead — one measure, centred. */}
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <p className="ld-eyebrow">Disciplines</p>
          <h2 id="disciplines-heading" className="ld-h2">
            Every performing art has a home here
          </h2>
          <p className="ld-p">
            From hip-hop to ballet, vocal coaching to stage direction — find the right discipline
            and the right people to grow with. Four categories, dozens of genres.
          </p>
        </Reveal>

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {disciplines.map((discipline, idx) => (
            <li key={discipline.title} className="h-full">
              <Reveal variant="scale" delay={idx * 60} className="h-full">
                <article className="ld-media h-full transition-transform duration-300 hover:-translate-y-1">
                  <Image
                    src={discipline.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="ld-media__img transition-transform duration-500 ease-out hover:scale-105"
                  />
                  <span className="ld-media__scrim" aria-hidden="true" />

                  <div className="ld-media__body">
                    <h3 className="ld-h3">{discipline.title}</h3>
                    <p className="ld-tagline">{discipline.tagline}</p>
                    <p className="ld-copy mt-2">{discipline.description}</p>

                    {/* Genre tags */}
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {discipline.genres.slice(0, 4).map((genre) => (
                        <li key={genre} className="ld-pill-glass inline-flex items-center gap-1.5 px-2.5 py-1">
                          <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                          {genre}
                        </li>
                      ))}
                      {discipline.genres.length > 4 && (
                        <li className="ld-pill-glass ld-pill-glass--quiet inline-flex items-center gap-1.5 px-2.5 py-1">
                          +{discipline.genres.length - 4} more
                        </li>
                      )}
                    </ul>

                    {/* Highlights */}
                    <ul className="mt-4 flex flex-col gap-1.5 pt-2 border-t border-[var(--border)]">
                      {discipline.highlights.map((highlight) => (
                        <li
                          key={highlight}
                          className="inline-flex items-start gap-2 text-[13px] text-[var(--muted-foreground)]"
                        >
                          <Check
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--success)]"
                            aria-hidden="true"
                          />
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default Disciplines;