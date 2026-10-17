'use client';

import React, { useState } from 'react';
import { SectionHeader } from '@/features/dance/components/SectionHeader';
import { Drama, Video, BookOpen, CheckCircle2, UserCheck } from 'lucide-react';
import { cn } from '@/components/shared/cn';

interface ActingModule {
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

const ACTING_MODULES: ActingModule[] = [
  {
    id: 'methods',
    title: 'Core Acting Techniques',
    subtitle: 'From Stanislavski’s psychological realism to Meisner’s emotional spontaneity',
    icon: Drama,
    items: [
      {
        name: 'Stanislavski System: Actioning & Given Circumstances',
        description: 'Grounding every line in an active transitive verb and truthful psychological objective.',
        instructions: [
          'Examine the playwright’s given circumstances: Where are you? What time is it? What just happened 5 minutes ago?',
          'Score your script with active transitive verbs (e.g., "to disarm", "to provoke", "to plead", "to seduce") rather than states of being.',
          'Identify your character’s Super-Objective (the driving hunger across the whole play) and scene objective.',
        ],
        focus: 'Active verbs · Given circumstances · Psychological objective',
      },
      {
        name: 'Meisner Technique: Living Truthfully Under Imaginary Circumstances',
        description: 'Eliminating self-conscious calculation through spontaneous behavioral repetition.',
        instructions: [
          'Engage in 2-person repetition exercises: repeat observation phrases based purely on what you observe in your partner right now.',
          'Let changes in tone, tempo, and emotional inflection happen instinctively rather than by intellectual design.',
          'Respond to behavior before dialogue: allow your partner’s physical shifts to pull the text out of you.',
        ],
        focus: 'Listening discipline · Spontaneous impulse · Emotional honesty',
      },
      {
        name: 'Physical Theater & Suzuki Discipline',
        description: 'High-energy spatial awareness, center-of-gravity grounding, and stomping discipline.',
        instructions: [
          'Drop your center of gravity toward the pelvic floor, keeping knees soft and feet rooted to the stage floor.',
          'Practice statuesque stillness: eliminate fidgeting, head-tilting, and extraneous hand gestures.',
          'Channel emotional crises through sustained physical tension and release rather than superficial vocal screaming.',
        ],
        focus: 'Spatial presence · Physical economy · Lower-body grounding',
      },
    ],
  },
  {
    id: 'character',
    title: 'Character Development & Script Analysis',
    subtitle: 'Building multifaceted, unforgettable characters from page to performance',
    icon: UserCheck,
    items: [
      {
        name: "Uta Hagen's 9 Fundamental Questions",
        description: 'The definitive character questionnaire used in top conservatories worldwide.',
        instructions: [
          '1. Who am I? 2. What are the given circumstances? 3. What are my relationships? 4. What do I want? (Objective)',
          '5. What is in my way? (Obstacle) 6. What do I do to get what I want? (Tactics/Actions)',
          '7. Why do I want it now? (Urgency) 8. What is my secret? 9. What is at stake if I fail?',
        ],
        focus: 'Psychological depth · Stakes assessment · Tactical versatility',
      },
      {
        name: 'Subtext & The Unspoken Inner Monologue',
        description: 'Creating the rich internal stream of consciousness beneath spoken dialogue.',
        instructions: [
          'Write out your character’s exact inner monologue in the margins of your script during your partner’s lines.',
          'Identify moments where the spoken line directly contradicts the true emotional desire (irony and defense mechanisms).',
          'Let the thoughts formulate behind the eyes before the articulators begin speaking the text.',
        ],
        focus: 'Subtextual richness · Eye-line thought · Behavioral nuance',
      },
    ],
  },
  {
    id: 'auditions',
    title: 'Audition Prep & Screen Self-Tapes',
    subtitle: 'Professional audition protocol for theater casting calls and film camera tests',
    icon: Video,
    items: [
      {
        name: 'Self-Tape Setup & Screen Etiquette',
        description: 'Industry-standard technical framing, lighting, and slate execution for film and streaming auditions.',
        instructions: [
          'Framing: Medium close-up (bust to top of head) against a neutral grey or blue non-distracting background.',
          'Lighting & Audio: Three-point lighting with soft fill; directional lavalier or shotgun mic placed 2 feet from actor.',
          'Eye-line: Place your reader’s eyes directly to the left or right of the camera lens—never look straight down the barrel unless instructed.',
        ],
        focus: 'Technical standards · Micro-expressions · Camera framing',
      },
      {
        name: 'Theater Stage Audition & Cold Reading',
        description: 'Entering the room, claiming space, and handling unrehearsed sides with confidence.',
        instructions: [
          'Enter with grounded posture; greet the panel warmly without apologizing or making excuses for health or preparation.',
          'Hold sides comfortably at chest level so your face remains illuminated by downstage lighting while glancing at text.',
          'Commit fully to a strong, bold choice: casting panels remember courageous choices over polite accuracy.',
        ],
        focus: 'Room presence · Cold-reading technique · Director adjustability',
      },
    ],
  },
  {
    id: 'monologues',
    title: 'Monologue Selection & Delivery',
    subtitle: 'Curating contrasting 60-second and 2-minute pieces that showcase your range',
    icon: BookOpen,
    items: [
      {
        name: 'Monologue Selection Strategy',
        description: 'Choosing material that fits your casting bracket while avoiding over-performed clichés.',
        instructions: [
          'Select pieces where the character is actively trying to change someone in the room right now—not narrating a past memory.',
          'Prepare two contrasting pieces: one classical verse (Shakespeare, Molière, Nick Joaquin) and one contemporary realistic drama.',
          'Keep your audition cut strictly under 90 seconds: leave the panel wanting more rather than checking their watches.',
        ],
        focus: 'Audition repertoire · Dramatic conflict · Contrasting pieces',
      },
      {
        name: 'Voice & Stage Diction Mechanics',
        description: 'Acoustic vocal projection and articulatory clarity without straining the vocal cords.',
        instructions: [
          'Engage the intercostal breathing muscles to project to the balcony without raising vocal pitch or throat strain.',
          'Drill plosive consonants (P, B, T, D, K, G) and sibilants to ensure intelligibility in live acoustic theaters.',
          'Practice neutral Filipino stage diction: clear, unstilted phrasing honoring the musical cadence of the language.',
        ],
        focus: 'Acoustic projection · Plosive articulation · Dialect clarity',
      },
    ],
  },
];

export function ActingCraftSection() {
  const [activeTab, setActiveTab] = useState<string>('methods');
  const activeModule = ACTING_MODULES.find((m) => m.id === activeTab) || ACTING_MODULES[0];

  return (
    <section id="acting-craft" aria-labelledby="acting-craft-title" className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <SectionHeader
        eyebrow="Stage Craft, Method &amp; Audition Mastery"
        title={
          <span id="acting-craft-title">
            Acting Techniques, <span className="font-normal italic text-muted-foreground">Monologues &amp; Auditions</span>
          </span>
        }
        description="Professional methods from Stanislavski and Meisner, character analysis frameworks, and audition preparation protocols."
      />

      <div className="mt-6 flex flex-wrap gap-2 border-b border-divider pb-4" role="tablist" aria-label="Acting craft modules">
        {ACTING_MODULES.map((m) => {
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

      <div key={activeTab} className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-250">
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
                    Actor Steps &amp; Discipline:
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
