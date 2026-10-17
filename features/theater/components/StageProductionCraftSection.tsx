'use client';

import React, { useState } from 'react';
import { SectionHeader } from '@/features/dance/components/SectionHeader';
import { PenTool, Compass, Sliders, Layers, CheckCircle2 } from 'lucide-react';
import { cn } from '@/components/shared/cn';

interface TheaterCraftModule {
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

const THEATER_MODULES: TheaterCraftModule[] = [
  {
    id: 'playwriting',
    title: 'Playwriting & Script Development',
    subtitle: 'Structuring original plays, dialogue rhythm, and submitting to the Virgin Labfest',
    icon: PenTool,
    items: [
      {
        name: 'Virgin Labfest One-Act Submission Standards',
        description: 'Submission guidelines for the country’s premier festival of untried, untested, and unstaged plays.',
        instructions: [
          'Target length: 30 to 45 minutes running time (approximately 25-35 pages in standard manuscript format).',
          'Cast size: Ideally 2 to 5 characters with manageable staging requirements suitable for black box production.',
          'Format: 12pt Courier, 1.5-inch left margin, character names centered, clear parenthetical stage directions.',
        ],
        focus: 'Standard manuscript · 30-45 min pacing · Black box staging',
      },
      {
        name: 'Dramatic Inciting Incident & Climax Architecture',
        description: 'Architecting dynamic narrative momentum within theatrical time constraints.',
        instructions: [
          'Introduce the inciting incident within the first 5 minutes to disrupt the status quo immediately.',
          'Ensure every scene forces a character choice that irreversibly changes the power dynamic in the room.',
          'Build toward a climactic scene of emotional or moral reckoning before the denouement.',
        ],
        focus: 'Inciting incident · Status shifts · Dramatic escalation',
      },
    ],
  },
  {
    id: 'direction',
    title: 'Stage Direction & Spatial Composition',
    subtitle: 'Stage geometry, visual picturization, and guiding actor movement with purpose',
    icon: Compass,
    items: [
      {
        name: 'Proscenium & Black Box Blocking Geometry',
        description: 'Mastering stage areas: Upstage Right, Center, Downstage Left, and triangular blocking.',
        instructions: [
          'Utilize Downstage Center (DSC) for high-intimacy emotional revelations and direct soliloquies.',
          'Create dynamic visual levels: place characters on platforms, chairs, or floor to visually map hierarchy.',
          'Avoid flat horizontal lines: arrange ensemble casts in depth-creating triangles and diagonal pathways.',
        ],
        focus: 'Stage areas · Visual levels · Triangular depth',
      },
      {
        name: 'Picturization & Visual Metaphor',
        description: 'Telling the story through silent stage tableaus and kinetic spatial arrangements.',
        instructions: [
          'Evaluate the stage picture without dialogue: does the spatial distance between characters convey their estrangement?',
          'Use contrast in posture, lighting focus, and costume color to guide the audience’s focal point.',
          'Direct rhythmically: vary tempo between rapid ensemble crossings and pregnant, breathless stillness.',
        ],
        focus: 'Visual storytelling · Stage composition · Tempo variation',
      },
    ],
  },
  {
    id: 'stagemgmt',
    title: 'Stage Management & The Prompt Book',
    subtitle: 'The organizational backbone of theatrical production from first read to final curtain',
    icon: Layers,
    items: [
      {
        name: 'The Prompt Book & Cue Calling Protocol',
        description: 'Documenting every lighting change (LX), sound effect (SQ), and deck automation cue.',
        instructions: [
          'Standard cue sequence: "Warning LX 24", "Standby LX 24 and SQ 12", and crisp vocal "GO".',
          'Annotate precise dialogue triggers and actor movements in a wide-margin prompt script binder.',
          'Maintain the Master Contact Sheet, Rehearsal Reports, and Daily Call Schedules.',
        ],
        focus: 'Prompt script · Headset etiquette · Rehearsal reports',
      },
      {
        name: 'Deck Management & Backstage Safety',
        description: 'Coordinating prop handoffs, quick-changes, fly system lines, and wing clearances.',
        instructions: [
          'Organize glow-tape markers on dark backstage floors for spike positions and actor entrances.',
          'Enforce silent backstage communication using red cue lights and non-verbal hand signals.',
          'Perform mandatory preset checks: every prop must be verified on the prop table 60 minutes before curtain.',
        ],
        focus: 'Spike marks · Prop preset · Quick-change coordination',
      },
    ],
  },
  {
    id: 'design',
    title: 'Scenic, Lighting & Sound Design',
    subtitle: 'Transforming empty space into evocative worlds through light, acoustics, and texture',
    icon: Sliders,
    items: [
      {
        name: 'Theatrical Lighting & Color Psychology',
        description: 'Key lights, fill lights, backlights, and thematic color temperatures (amber vs. tungsten vs. steel blue).',
        instructions: [
          'Use high-angle backlight to separate actors visually from dark scenic flats and set pieces.',
          'Deploy steel blue (Lee 201) for nocturnal or melancholic scenes, transitioning to warm amber for domestic comfort.',
          'Use patterned gobos through ellipsoidal reflectors to project textured foliage or prison bars onto the stage floor.',
        ],
        focus: 'Color temperature · Gobo patterns · Visual separation',
      },
      {
        name: 'Live Theater Sound & Acoustic Engineering',
        description: 'Balancing live wireless lavalier bodypacks, pit orchestra monitoring, and spatial SFX.',
        instructions: [
          'Position wireless bodypack elements at the hairline or ear-rig to capture natural facial resonance.',
          'Notch out room feedback frequencies on the digital console EQ before tech rehearsals begin.',
          'Layer atmospheric ambient soundscapes (rain, distant Manila traffic) subtly below actor speech intelligibility.',
        ],
        focus: 'Hairline mic placement · Feedback suppression · Atmospheric soundscapes',
      },
    ],
  },
];

export function StageProductionCraftSection() {
  const [activeTab, setActiveTab] = useState<string>('playwriting');
  const activeModule = THEATER_MODULES.find((m) => m.id === activeTab) || THEATER_MODULES[0];

  return (
    <section id="stage-craft" aria-labelledby="stage-craft-title" className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <SectionHeader
        eyebrow="Playwriting, Direction &amp; Backstage Craft"
        title={
          <span id="stage-craft-title">
            Stage Production, <span className="font-normal italic text-muted-foreground">Scripts &amp; Direction</span>
          </span>
        }
        description="Essential resources for playwrights, stage directors, stage managers, and technical theater artisans."
      />

      <div className="mt-6 flex flex-wrap gap-2 border-b border-divider pb-4" role="tablist" aria-label="Theater craft modules">
        {THEATER_MODULES.map((m) => {
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

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
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
                    Production Standards &amp; Methods:
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
