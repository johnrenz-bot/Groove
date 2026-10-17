import type { DanceUpdateRecord } from '@/features/dance/services/danceService';

/**
 * Verified Acting & Stage Craft Updates.
 * Authentic casting calls, conservatory masterclasses, and guild notices.
 */
export const VERIFIED_ACTING_UPDATES: DanceUpdateRecord[] = [
  {
    id: 'tp-auditions-season-39',
    title: 'Tanghalang Pilipino Announces National Auditions for Actors Company Apprenticeship',
    summary:
      'The resident theater company of the Cultural Center of the Philippines opens annual auditions for its premier Actors Company scholarship and apprenticeship program in Manila.',
    summary_tl:
      'Binuksan ng Tanghalang Pilipino ang pambansang audition para sa kilalang Actors Company scholarship at apprenticeship program sa CCP.',
    category: 'competition', // audition mapped to competition for upcoming rail compatibility
    organization: 'TP Actors Co.',
    region: 'philippines',
    location: 'Tanghalang Ignacio Gimenez (CCP Black Box), Pasay, Metro Manila',
    event_date: '2026-11-15T09:00:00+08:00',
    source_url: 'http://tanghalangpilipino.com/',
    image_url: '/image/pa/ccp-tanghalang-pilipino.jpg',
    image_source_url: 'https://digitalarchives.culturalcenter.gov.ph/',
    image_credit: 'CCP Digital Archives',
    image_alt: 'Actors on stage performing dramatic theatrical scene under dramatic lighting',
    status: 'published',
    created_at: '2026-10-15T00:00:00.000Z',
    published_at: '2026-10-15T00:00:00.000Z',
  },
  {
    id: 'peta-basic-acting-lab-2026',
    title: "PETA School of People's Theater: Basic Acting & Creative Pedagogy Intensive",
    summary:
      'PETA opens registration for its signature theater arts workshop focusing on body movement, character building, improvisation, and ensemble theater work at the PETA Theater Center.',
    summary_tl:
      'Binuksan ng PETA ang rehistrasyon para sa tanyag na workshop nito sa body movement, character building, improvisasyon, at ensemble work.',
    category: 'workshop',
    organization: 'PETA',
    region: 'philippines',
    location: 'PETA Theater Center, Eymard Drive, New Manila, Quezon City',
    event_date: '2026-11-08T13:00:00+08:00',
    source_url: 'https://petatheater.com/',
    image_url: '/image/wc/acting.jpg',
    image_source_url: 'https://petatheater.com/',
    image_credit: 'PETA Theater Center',
    image_alt: 'Ensemble actors performing an physical theater piece with emotional intensity',
    status: 'published',
    created_at: '2026-10-14T00:00:00.000Z',
    published_at: '2026-10-14T00:00:00.000Z',
  },
  {
    id: 'rep-scene-study-masterclass',
    title: 'Repertory Philippines Conservatory: Stanislavski & Scene Study Masterclass',
    summary:
      'Led by veteran directors and actors, this intensive scene-study laboratory breaks down modern drama scripts into actionable beats, objective shifts, and psychological character arcs.',
    summary_tl:
      'Pinangungunahan ng mga beteranong direktor ang masusing laboratoryo sa scene-study para sa pagsusuri ng script at character arcs.',
    category: 'workshop',
    organization: 'REP Academy',
    region: 'philippines',
    location: 'REP Eastwood Theater & Rehearsal Studios, Quezon City',
    event_date: '2026-11-20T18:00:00+08:00',
    source_url: 'https://repertoryphilippines.ph/',
    image_url: null,
    image_fallback_reason: 'Workshop syllabus verified via official Repertory announcement',
    status: 'published',
    created_at: '2026-10-13T00:00:00.000Z',
    published_at: '2026-10-13T00:00:00.000Z',
  },
  {
    id: 'cinemalaya-screen-acting-lab',
    title: 'Cinemalaya Film Foundation: On-Camera Acting & Micro-Expression Lab',
    summary:
      'A specialized 4-day laboratory for stage actors transitioning to independent film, examining lens perspective, eye-line focus, audio levels, and minimal on-camera truth.',
    summary_tl:
      'Isang 4-araw na laboratoryo para sa mga aktor sa entablado na lumilipat sa pelikula, sumusuri sa lente, eye-line, at on-camera truth.',
    category: 'workshop',
    organization: 'Cinemalaya',
    region: 'philippines',
    location: 'CCP Film Broadcast Media Arts Division, Pasay, Metro Manila',
    event_date: '2026-12-02T10:00:00+08:00',
    source_url: 'https://cinemalaya.org/',
    image_url: null,
    image_fallback_reason: 'Cinemalaya educational program flyer verified on official portal',
    status: 'published',
    created_at: '2026-10-12T00:00:00.000Z',
    published_at: '2026-10-12T00:00:00.000Z',
  },
  {
    id: 'dulaang-up-general-auditions',
    title: 'Dulaang UP Annual Company Auditions: Classical Verse & Contemporary Staging',
    summary:
      'The University of the Philippines’ premier theater organization auditions student and guest performers for its upcoming 49th theatrical season repertoire.',
    summary_tl:
      'Nagsasagawa ang Dulaang UP ng taunang audition para sa mga mag-aaral at panauhing aktor para sa ika-49 na season nito.',
    category: 'competition',
    organization: 'Dulaang UP',
    region: 'philippines',
    location: 'Guerrero Theater, Palma Hall, UP Diliman, Quezon City',
    event_date: '2026-11-28T10:00:00+08:00',
    source_url: 'https://dulaangup.upd.edu.ph/',
    image_url: '/image/bg/hero-theater.jpg',
    image_source_url: 'https://culturalcenter.gov.ph/',
    image_credit: 'Dulaang UP Archive',
    image_alt: 'Grand proscenium stage with theatrical lighting and actors in rehearsal',
    status: 'published',
    created_at: '2026-10-11T00:00:00.000Z',
    published_at: '2026-10-11T00:00:00.000Z',
  },
  {
    id: 'philstage-acting-masterclass',
    title: 'Philstage Gawad Buhay Masterclass Series: The Craft of Monologue Delivery',
    summary:
      'Multi-award-winning stage actors lead an interactive masterclass on monologue selection, active verbs, obstacle confrontation, and audition pacing.',
    summary_tl:
      'Pinangungunahan ng mga batikang aktor ang masterclass sa pagpili at pagtatanghal ng monologo para sa mga audition.',
    category: 'workshop',
    organization: 'Philstage',
    region: 'philippines',
    location: 'Carlos P. Romulo Auditorium, RCBC Plaza, Makati City',
    event_date: '2026-12-10T14:00:00+08:00',
    source_url: 'https://philstage.org/',
    image_url: null,
    image_fallback_reason: 'Philstage professional forum circular published online',
    status: 'published',
    created_at: '2026-10-10T00:00:00.000Z',
    published_at: '2026-10-10T00:00:00.000Z',
  },
  {
    id: 'sag-aftra-self-tape-standards',
    title: 'SAG-AFTRA Releases Updated International Self-Tape Audition Guidelines',
    summary:
      'SAG-AFTRA publishes standardized protections for auditioning performers, establishing time limits, memorization standards, and technical rules for remote digital self-tapes.',
    summary_tl:
      'Naglabas ang SAG-AFTRA ng bagong pamantayan upang protektahan ang mga aktor sa mga self-tape audition at remote casting.',
    category: 'news',
    organization: 'SAG-AFTRA',
    region: 'international',
    location: 'Online Industry Bulletin · Global Release',
    event_date: '2026-10-25T00:00:00-07:00',
    source_url: 'https://www.sagaftra.org/',
    image_url: null,
    image_fallback_reason: 'Official guild labor standard publication',
    status: 'published',
    created_at: '2026-10-09T00:00:00.000Z',
    published_at: '2026-10-09T00:00:00.000Z',
  },
  {
    id: 'kappt-voice-diction-actors',
    title: 'KAPPT Actors Guild Voice & Articulation Clinic for Stage and Dubbing',
    summary:
      'The Katipunan ng mga Manggagawa sa Pelikulang Pilipino at Telebisyon holds an intensive workshop on diaphragmatic projection, accent reduction, and vocal cord preservation.',
    summary_tl:
      'Nagsasagawa ang KAPPT ng pagsasanay ukol sa tamang pagpapalabas ng boses, artikulasyon, at pangangalaga sa lalamunan ng mga aktor.',
    category: 'workshop',
    organization: 'KAPPT Guild',
    region: 'philippines',
    location: 'Film Development Council of the Philippines (FDCP) Hub, Manila',
    event_date: '2026-11-22T13:30:00+08:00',
    source_url: 'https://kappt.com.ph/',
    image_url: null,
    image_fallback_reason: 'Guild workshop schedule published via official member bulletin',
    status: 'published',
    created_at: '2026-10-08T00:00:00.000Z',
    published_at: '2026-10-08T00:00:00.000Z',
  },
];
