'use client';

import React, { useState } from 'react';
import { SectionHeader } from '@/features/dance/components/SectionHeader';
import { Wind, HeartPulse, Sparkles, Volume2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/components/shared/cn';

interface TechniqueModule {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  items: {
    name: string;
    description: string;
    instructions: string[];
    focus: string;
  }[];
}

const MODULES: TechniqueModule[] = [
  {
    id: 'warmups',
    title: 'Warm-Ups & Daily Practice',
    subtitle: '15-minute daily vocal calibration for pitch stability, agility, and tension release',
    icon: Wind,
    items: [
      {
        name: 'Diaphragmatic Breath & Appoggio Control',
        description: 'The foundation of sustainable vocal power without laryngeal constriction.',
        instructions: [
          'Inhale silently through nose and mouth, allowing lower ribs and abdomen to expand 360 degrees.',
          'Engage the epigastric wall gently to resist immediate collapse during exhalation.',
          'Hiss evenly on an "S" consonant for 20-30 seconds with a consistent metronome pulse.',
        ],
        focus: 'Breath support · Intercostal expansion · Core stability',
      },
      {
        name: 'Semi-Occluded Vocal Tract (SOVT) Lip Trills',
        description: 'Equalizes supraglottic air pressure, protecting vocal folds during range extension.',
        instructions: [
          'Gently buzz the lips while gliding smoothly from lowest chest register to highest head voice.',
          'Maintain a relaxed jaw and avoid pressing upward on high frequencies.',
          'Repeat descending 5-tone triads across 3 octaves.',
        ],
        focus: 'Vocal tract balance · Glottal closure · Passaggio smoothing',
      },
      {
        name: 'Staccato Arpeggios & Articulator Agility',
        description: 'Calibrates rapid cord adduction and agility across coloratura passages.',
        instructions: [
          'Sing 1-3-5-8-5-3-1 arpeggios on "Ha-Ha-Ha" with crisp abdominal pulses.',
          'Keep tongue tip resting behind lower incisors to avoid tongue-root tension.',
          'Gradually accelerate tempo from 80 BPM to 140 BPM.',
        ],
        focus: 'Cord adduction · Articulation speed · Intonation accuracy',
      },
    ],
  },
  {
    id: 'registers',
    title: 'Vocal Registers & Passaggio',
    subtitle: 'Mastering chest voice, mixed voice, and head resonance across vocal transitions',
    icon: Volume2,
    items: [
      {
        name: 'Chest Voice (Voce di Petto / Thyroarytenoid Dominance)',
        description: 'Full-depth fold vibration creating powerful speaking and low-range vocal tone.',
        instructions: [
          'Place hand on sternum to feel acoustic vibrations during "Ah" vowel phonation.',
          'Avoid pushing heavy chest resonance above the primo passaggio (around D4 for men, F4 for women).',
          'Practice descending scalar runs to keep tone resonant without raspiness.',
        ],
        focus: 'Rich overtones · Low-frequency resonance · Laryngeal stability',
      },
      {
        name: 'The Pharyngeal Mix (Voix Mixte)',
        description: 'The seamless blend of thyroarytenoid power and cricothyroid stretch.',
        instructions: [
          'Phonate on a bright, narrow "Nay" or "Gug" to trigger twang narrowing in the epilarynx.',
          'Blend oral and pharyngeal resonance so volume increases without pushing breath pressure.',
          'Gradually bridge through E4 to G5 without an audible crack or sudden flip.',
        ],
        focus: 'Mixed voice · Belt resonance · Seamless registration',
      },
      {
        name: 'Head Voice & Falsetto (Cricothyroid Dominance)',
        description: 'Thin, stretched vocal fold vibration utilizing the sinus and cranial resonators.',
        instructions: [
          'Simulate a gentle hoot on an "Oo" vowel, aiming resonance behind the eyes and forehead.',
          'Distinguish true head voice (full cord adduction) from breathy falsetto (incomplete closure).',
          'Use soft messa di voce exercises (crescendo from pianissimo to forte and back).',
        ],
        focus: 'High register agility · Soft palate lift · Pure harmonics',
      },
    ],
  },
  {
    id: 'genres',
    title: 'Singing Styles & Philippine Literature',
    subtitle: 'Vocal techniques tailored for Kundiman, Musical Theater, Pop/R&B, and Choral works',
    icon: Sparkles,
    items: [
      {
        name: 'Classical Kundiman & Philippine Art Song',
        description: 'Lyric Tagalog diction, expressive rubato, and romantic bel canto phrasing.',
        instructions: [
          'Articulate rounded Tagalog vowels (A, E, I, O, U) with Italianate purity and forward resonance.',
          'Execute elegant rubato phrasing following the emotional contours of poets like Baltazar and De Jesus.',
          'Maintain legato line connection between syllables without harsh glottal stops.',
        ],
        focus: 'Tagalog lyric diction · Rubato nuance · Legato connection',
      },
      {
        name: 'Contemporary Musical Theater Belting',
        description: 'High-intensity theatrical vocal projection balancing acoustic formant tuning.',
        instructions: [
          'Deploy speech-level resonance with an elevated soft palate and slight aryepiglottic tilt.',
          'Anchor physically with latissimus and pelvic floor support during sustained dramatic climaxes.',
          'Shape vowels towards modified open phonemes (e.g., "ih" toward "eh", "ee" toward "ih").',
        ],
        focus: 'Theatrical projection · Vowel modification · Stage endurance',
      },
      {
        name: 'Polyphonic Choral Blend & Intonation',
        description: 'The signature Philippine choral discipline of unified overtone resonance.',
        instructions: [
          'Eliminate soloistic wide vibrato in favor of a straight, shimmering harmonic overtone series.',
          'Adjust third and fifth intervals according to pure Just Intonation rather than equal temperament.',
          'Listen laterally across all four vocal parts (Soprano, Alto, Tenor, Bass) to lock vowel centers.',
        ],
        focus: 'Harmonic blend · Pure overtones · Just intonation tuning',
      },
    ],
  },
  {
    id: 'health',
    title: 'Vocal Health & Longevity',
    subtitle: 'Essential vocal hygiene protocols used by touring vocalists and recording artists',
    icon: HeartPulse,
    items: [
      {
        name: 'Systemic & Topical Hydration',
        description: 'Maintaining mucous membrane pliability to minimize vocal fold friction.',
        instructions: [
          'Consume 2.5 to 3 liters of room-temperature water daily; avoid iced drinks 2 hours prior to singing.',
          'Use 0.9% isotonic saline nebulization for direct hydration of vocal cord mucosa.',
          'Avoid drying antihistamines or throat lozenges with numbing menthol before rehearsals.',
        ],
        focus: 'Mucosal lubrication · Saline therapy · Acoustic pliability',
      },
      {
        name: 'Strategic Vocal Rest & Recovery',
        description: 'Managing vocal load during demanding multi-show runs and rehearsals.',
        instructions: [
          'Adhere to a 1:1 rule: for every 45 minutes of vocal performance, take 15 minutes of silence.',
          'Do gentle semi-occluded straw phonation in water to massage tired vocal folds post-performance.',
          'Monitor the onset of morning phonation: hoarseness indicates accumulated vocal fatigue.',
        ],
        focus: 'Fatigue mitigation · Straw therapy · Phonation recovery',
      },
    ],
  },
];

export function VocalTechniqueSection() {
  const [activeTab, setActiveTab] = useState<string>('warmups');
  const activeModule = MODULES.find((m) => m.id === activeTab) || MODULES[0];

  return (
    <section id="vocal-craft" aria-labelledby="vocal-craft-title" className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <SectionHeader
        eyebrow="Pedagogy & Vocal Performance Mastery"
        title={
          <span id="vocal-craft-title">
            Vocal Techniques, <span className="font-normal italic text-muted-foreground">Warm-Ups &amp; Training</span>
          </span>
        }
        description="Comprehensive vocal routines, registration acoustics, and Filipino literature styling curated for singers of all levels."
      />

      {/* Module Selector Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-divider pb-4" role="tablist" aria-label="Vocal technique modules">
        {MODULES.map((m) => {
          const isSelected = activeTab === m.id;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveTab(m.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                isSelected
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'bg-muted/20 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{m.title}</span>
            </button>
          );
        })}
      </div>

      {/* Active Module Content */}
      <div className="mt-6">
        <p className="text-xs font-medium text-muted-foreground sm:text-sm">
          {activeModule.subtitle}
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {activeModule.items.map((item) => (
            <div
              key={item.name}
              className="flex flex-col justify-between rounded-xl border border-border bg-muted/15 p-5 shadow-xs transition hover:border-border-strong hover:bg-muted/25"
            >
              <div>
                <span className="inline-block rounded bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-text">
                  {item.focus}
                </span>
                <h4 className="mt-3 text-sm font-bold text-foreground sm:text-base">
                  {item.name}
                </h4>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {item.description}
                </p>

                <div className="mt-4 space-y-2 border-t border-divider pt-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Practice Steps:
                  </div>
                  <ul className="space-y-1.5 text-xs text-foreground/90">
                    {item.instructions.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
