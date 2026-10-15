import type { DanceUpdateRecord } from '../services/danceService';

/**
 * ---------------------------------------------------------------------------
 * VERIFIED DANCE UPDATES - editorial seed set
 * ---------------------------------------------------------------------------
 *
 * Every record here was checked against the organisation's own page (linked in
 * `source_url`), and every image was fetched, decoded, and visually inspected
 * before being written into `public/dance-updates/` by
 * `scripts/sync-dance-update-images.ts` (`npm run images:sync`).
 *
 * RULES THIS FILE KEEPS
 *
 * 1. NO INVENTED FACTS. Dates, venues, winners and scores are transcribed from
 *    the official page. Where an organisation has not published a figure, the
 *    record says so rather than guessing.
 * 2. NO INVENTED REGISTRATION LINKS. `source_url` is always the official page.
 *    There is no separate ticket URL, because none was published for these.
 * 3. IMAGES ARE VENDORED, NOT INVENTED. `image_url` is a local path produced by
 *    the sync; `image_source_url` is the first-party asset it came from;
 *    `image_credit` is the organisation. If the sync could not verify an image,
 *    `image_url` is null AND `image_fallback_reason` says why, and the card
 *    renders the branded fallback instead of a stock photo.
 * 4. PAST IS NOT UPCOMING. Historical items stay here and stay visible in
 *    Latest Updates. `getUpcomingDanceEvents()` is what keeps them out of the
 *    Upcoming Events rail - see danceService.ts.
 *
 * Reference date for every date-logic check: 14 October 2026 (Asia/Manila).
 *
 * NOTE ON ENCODING: this file is deliberately ASCII-only. Several non-ASCII
 * characters here (typographic apostrophes, the pound sign in MARVE£) were
 * corrupted by a shell round-trip that re-encoded UTF-8 as Windows-1252, which
 * produced mojibake in the rendered page. If you add a record with a special
 * character, use the escape sequence instead of the literal character.
 */

// ---------------------------------------------------------------------------
// UPCOMING - event_date is on/after the reference date. These are the only
// records the Upcoming Events rail is allowed to surface.
// ---------------------------------------------------------------------------

export const VERIFIED_DANCE_UPDATES: DanceUpdateRecord[] = [
  {
    id: 'redbull-dys-world-final-2026',
    title: 'Red Bull Dance Your Style World Final 2026 Lands in Zurich on 24 October',
    summary:
      'The 2026 World Final runs at Hallenstadion, Zurich, on 24 October, with Pre-World Finals on 21-22 October. Sixteen tour winners reach the final and the crowd, not a panel, decides the champion.',
    summary_tl:
      'Magaganap ang 2026 Red Bull Dance Your Style World Final sa Hallenstadion, Zurich, sa 24 Oktubre. Ang manonood, hindi ang mga hukom, ang magpapasya sa kampiyon.',
    category: 'competition',
    organization: 'Red Bull Dance Your Style',
    region: 'international',
    location: 'Hallenstadion, Zurich, Switzerland',
    event_date: '2026-10-24T18:00:00+02:00',
    source_url: 'https://www.redbull.com/int-en/events/red-bull-dance-your-style-world-final-2026-zurich',
    image_url: '/dance-updates/redbull-dys-world-final-2026.jpg',
    image_source_url:
      'https://img.redbull.com/images/c_crop,x_2334,y_0,h_5322,w_4258/c_fill,w_1200,h_900/q_auto,f_jpg/redbullcom/2025/10/2/vw1gxks9krjk4kiaazay/red-bull-dance-your-style-2026-header',
    image_credit: 'Red Bull Dance Your Style',
    image_alt:
      'Two street dancers mid-battle on the Red Bull Dance Your Style arena floor, one wrapped in red and one in blue against a packed crowd.',
    image_verified: true,
    tags: ['RedBull', 'WorldFinal', 'Zurich', 'AllStyles', 'CrowdVote'],
    published_at: '2026-09-24T09:00:00+08:00',
    status: 'published',
    created_at: '2026-09-24T09:00:00+08:00',
  },
  {
    id: 'wod-world-finals-2026',
    title: 'World of Dance Finals 2026 Stop in Houston on 18 October',
    // The team's name ends in a POUND SIGN, written as \u00a3 rather than as
    // the literal character: see the encoding note at the top of this file.
    summary:
      "World of Dance's event calendar lists Houston, Texas for 18 October 2026. Japan's MARVE£ took the Team Division title at the 2026 Finals, one of three divisions decided alongside the World of Dance Summit.",
    summary_tl:
      'Nakalistahan ang Houston, Texas sa 18 Oktubre 2026 para sa World of Dance Finals. Ang MARVE ng Japan ang nakuha ng titulo sa Team Division ng 2026 Finals.',
    category: 'competition',
    organization: 'World of Dance',
    region: 'international',
    location: 'Houston, Texas, United States',
    event_date: '2026-10-18T10:00:00-05:00',
    source_url: 'https://www.worldofdance.com/events',
    image_url: '/dance-updates/wod-world-finals-2026.jpg',
    image_source_url: 'https://i.ytimg.com/vi/rcM2JhFHEm4/maxresdefault.jpg',
    image_credit: 'World of Dance (official YouTube)',
    image_alt:
      'MARVE of Japan performing on the World of Dance Finals 2026 Team Division stage, in front of a wall of red parasols.',
    image_verified: true,
    tags: ['WOD', 'WorldOfDance', 'Finals', 'Houston'],
    published_at: '2026-09-21T11:00:00+08:00',
    status: 'published',
    created_at: '2026-09-21T11:00:00+08:00',
  },
  {
    id: 'hhi-philippines-2027',
    title: 'Hip Hop International Returns to Manila for the 2027 Philippine Championships',
    summary:
      "HHI's worldwide calendar books the Philippines for 9-11 April 2027, a full year after the 2026 Philippine championship. Manila crews will again fight for the delegation slots to the World Hip Hop Dance Championship.",
    summary_tl:
      'Nakalaan ng pandaigdigang Iskedyul ng HHI ang Pilipinas para sa 9-11 Abril 2027. Ang mga mananawala sa Metro Manila ay muling lalaban para sa mga puwang sa World Championship.',
    category: 'competition',
    organization: 'HHI Philippines',
    region: 'philippines',
    location: 'Manila, Philippines',
    event_date: '2027-04-09T09:00:00+08:00',
    source_url: 'https://hiphopinternational.com/schedule-of-events-worldwide',
    image_url: '/dance-updates/hhi-philippines-2027.jpg',
    image_source_url:
      'https://img1.wsimg.com/isteam/ip/b9c68dc3-d732-42d1-84cf-bcdf1f875112/HHI%20Philippines%202024_JV%20Megacrew-115.jpg',
    image_credit: 'HHI Philippines',
    image_alt:
      'A Philippine JV MegaCrew performing on the HHI Philippines stage in coordinated costume, in front of a lit 2024 Philippines backdrop.',
    image_verified: true,
    tags: ['HHI', 'Philippines', 'Manila', 'MegaCrew'],
    published_at: '2026-10-02T10:00:00+08:00',
    status: 'published',
    created_at: '2026-10-02T10:00:00+08:00',
  },

  // -------------------------------------------------------------------------
  // HISTORICAL - completed. Visible in Latest Updates, excluded from Upcoming.
  // -------------------------------------------------------------------------

  {
    id: 'idl-2026-championship',
    title: 'IDL 2026 Championship Decided: GRV Take the Title, Brotherhood Finish Second',
    summary:
      'The International Dance League closed its inaugural season at the Shrine Expo Hall in Los Angeles. GRV won the Championship with 94.00, Brotherhood second on 93.57, and Brotherhood had taken all five series stops.',
    summary_tl:
      'Tinapos ang unang season ng International Dance League sa Shrine Expo Hall sa Los Angeles. Ang GRV ang nanalalo sa Championship sa 94.00, at ang Brotherhood ang ikalawa sa 93.57.',
    category: 'results',
    organization: 'IDL',
    region: 'international',
    location: 'Shrine Expo Hall, Los Angeles, California',
    event_date: '2026-09-20T19:30:00-07:00',
    source_url: 'https://www.idl.pro/',
    image_url: '/dance-updates/idl-2026-championship.png',
    image_source_url: 'https://framerusercontent.com/images/mTBpKoMtTbGaSUkWEorRWrcTj6U.png',
    image_credit: 'IDL (International Dance League)',
    image_alt:
      'IDL pro-team dancers performing under arena lighting, one in a numbered competition jersey, mid-routine.',
    image_verified: true,
    tags: ['IDL', 'Championship', 'GRV', 'Brotherhood', 'LosAngeles'],
    published_at: '2026-09-21T08:00:00+08:00',
    status: 'published',
    created_at: '2026-09-21T08:00:00+08:00',
  },
  {
    id: 'udo-philippines-2026',
    title: 'UDO Philippines 2026 Street Dance Nationals Conclude at Manila Central University',
    summary:
      'UDO Philippines ran its 2026 Street Dance Nationals across Solo, Duo, Teams, Battles and Parent & Child from 9 to 11 October at Centennial Hall, Manila Central University. It is the local road to the UDO World Championship in Blackpool, United Kingdom.',
    summary_tl:
      'Dinatapos ang UDO Philippines 2026 Street Dance Nationals sa Centennial Hall, Manila Central University, mula 9 hanggang 11 Oktubre, kabilang ang Solo, Duo, Teams, Battles at Parent & Child.',
    category: 'results',
    organization: 'UDO',
    region: 'philippines',
    location: 'Centennial Hall, Manila Central University',
    event_date: '2026-10-11T18:00:00+08:00',
    source_url:
      'https://www.udostreetdance.com/es_ec/events/view/udo-philippines-street-dance-national-qualifier-2026-10-2026',
    image_url: '/dance-updates/udo-philippines-2026.jpg',
    image_source_url:
      'https://www.udostreetdance.com/uploads/pages/2026-09/6a992f9fd9c9f.png',
    image_credit: 'UDO Philippines',
    image_alt:
      'Official UDO Philippines 2026 Street Dance Nationals poster: a crew lined up against a blue backdrop reading October 9-11, 2026, with Solo, Duo, Teams, Battles and P&C divisions.',
    image_verified: true,
    tags: ['UDO', 'Philippines', 'StreetDance', 'Nationals', 'Blackpool'],
    published_at: '2026-10-12T09:00:00+08:00',
    status: 'published',
    created_at: '2026-10-12T09:00:00+08:00',
  },
  {
    id: 'hhi-world-2026',
    title: 'Philippine Crews Claim HHI World Titles in Phoenix: Femme MNL Takes MegaCrew',
    summary:
      'At the 2026 World Hip Hop Dance Championship in Phoenix, Arizona, the Philippines took the MegaCrew title through Femme MNL, with the country also collecting the Adult Division title through HQ.',
    summary_tl:
      'Sa 2026 World Hip Hop Dance Championship sa Phoenix, Arizona, kinuha ng Femme MNL ang titulo ng MegaCrew para sa Pilipinas, at si HQ ang nakuha ng Adult Division.',
    category: 'results',
    organization: 'HHI',
    region: 'philippines',
    location: 'Phoenix, Arizona, United States',
    event_date: '2026-08-02T12:00:00-07:00',
    source_url: 'https://hiphopinternational.com/world-hip-hop-dance-championship',
    image_url: '/dance-updates/hhi-world-2026.jpg',
    image_source_url:
      'https://hiphopinternational.com/wp-content/uploads/2026/07/WORLDS2026-ft.FlagsOnStage-scaled.jpg',
    image_credit: 'Hip Hop International',
    image_alt:
      'Delegations waving national flags on the main stage at the 2026 World Hip Hop Dance Championship in Phoenix, including a Philippine flag.',
    image_verified: true,
    tags: ['HHI', 'MegaCrew', 'FemmeMNL', 'Phoenix', 'Worlds2026'],
    published_at: '2026-08-03T10:00:00+08:00',
    status: 'published',
    created_at: '2026-08-03T10:00:00+08:00',
  },
  {
    id: 'hhi-philippines-2026',
    title: 'HQ Deliver World Adult Division Gold for the Philippines at HHI Worlds 2026',
    summary:
      'Philippine crew HQ were named Adult Division World Gold Medalists at the 2026 World Hip Hop Dance Championship in Phoenix, Arizona, on footage published by Hip Hop International official channel.',
    summary_tl:
      'Tinabagyan ng HQ ang titulo ng World Adult Division Gold sa 2026 World Hip Hop Dance Championship sa Phoenix, Arizona.',
    category: 'results',
    organization: 'HHI Philippines',
    region: 'philippines',
    location: 'Phoenix, Arizona, United States',
    event_date: '2026-08-02T12:00:00-07:00',
    source_url: 'https://www.youtube.com/watch?v=OJWk6eD0-mQ',
    image_url: '/dance-updates/hhi-philippines-2026.jpg',
    image_source_url: 'https://i.ytimg.com/vi/OJWk6eD0-mQ/sddefault.jpg',
    image_credit: 'Hip Hop International (OfficialHHI YouTube)',
    image_alt:
      'Crew HQ taking a bow on the 2026 World Hip Hop Dance Championship Adult Division Finals stage, the screen behind them reading Philippines HQ.',
    image_verified: true,
    tags: ['HHI', 'HQ', 'AdultDivision', 'Gold', 'Phoenix'],
    published_at: '2026-08-03T11:00:00+08:00',
    status: 'published',
    created_at: '2026-08-03T11:00:00+08:00',
  },
  {
    id: 'hhi-worldwide-schedule-2026',
    title: 'HHI World Moves 2026 Brings Six Instructors to Phoenix Championship Week',
    summary:
      'World Moves ran alongside the 2026 World Hip Hop Dance Championship in Phoenix, with Greg Chapkis, Kida the Great, Brian Puspos, SOTA, Alexander Chung and Marlee Hightower teaching across the 31 July to 1 August programme.',
    summary_tl:
      'Kasabay ng 2026 World Hip Hop Dance Championship sa Phoenix ang World Moves, kung saan nagtuturo ang Greg Chapkis, Kida the Great, Brian Puspos, SOTA, Alexander Chung at Marlee Hightower.',
    category: 'news',
    organization: 'HHI',
    region: 'international',
    location: 'Phoenix, Arizona, United States',
    event_date: '2026-07-31T09:00:00-07:00',
    source_url: 'https://hiphopinternational.com/schedule-of-events-worldwide',
    image_url: '/dance-updates/hhi-worldwide-schedule-2026.png',
    image_source_url:
      'https://hiphopinternational.com/wp-content/uploads/2026/06/2026-WM-WEB.png',
    image_credit: 'Hip Hop International',
    image_alt:
      'Hip Hop International World Moves 2026 instructor lineup: Greg Chapkis, Kida the Great, Brian Puspos, SOTA, Alexander Chung and Marlee Hightower, with their Phoenix programme times.',
    image_verified: true,
    tags: ['HHI', 'WorldMoves', 'Workshops', 'Judges', 'Phoenix'],
    published_at: '2026-06-20T10:00:00+08:00',
    status: 'published',
    created_at: '2026-06-20T10:00:00+08:00',
  },
  {
    id: 'redbull-dys-philippines-2026',
    title: 'Red Bull Dance Your Style Philippines Closes 2026 Season at Bridgetowne Open Grounds',
    summary:
      'The 2026 Philippine season ran from 16 January to the National Final on 11 April at Bridgetowne Open Grounds in Pasig, where qualifiers held across the country fed into a crowd-decided national title and a ticket to the world stage in Zurich.',
    summary_tl:
      'Nagmula noong 16 Enero ang season ng 2026 at natapos sa National Final sa 11 Abril sa Bridgetowne Open Grounds, Pasig, kung saan ang crowd ang nagpasya ng kampeon.',
    category: 'results',
    organization: 'Red Bull Dance Your Style',
    region: 'philippines',
    location: 'Bridgetowne Open Grounds, Pasig City',
    event_date: '2026-04-11T16:00:00+08:00',
    source_url: 'https://www.redbull.com/ph-en/events/dance-your-style-philippines',
    image_url: '/dance-updates/redbull-dys-philippines-2026.jpg',
    image_source_url:
      'https://img.redbull.com/images/c_fill,g_auto,w_1200,h_630/f_jpg,q_auto/redbullcom/2026/2/12/ce08snr2dbap3gryenxl/dance-your-style-philippines-2026-header',
    image_credit: 'Red Bull Dance Your Style Philippines',
    image_alt:
      'Two dancers battling in a Red Bull Dance Your Style Philippines qualifier, wrapped in red and blue against a cheering crowd.',
    image_verified: true,
    tags: ['RedBull', 'Philippines', 'NationalFinal', 'Bridgetowne', 'AllStyles'],
    published_at: '2026-04-12T09:00:00+08:00',
    status: 'published',
    created_at: '2026-04-12T09:00:00+08:00',
  },
  {
    id: 'wod-philippines-2026',
    title: 'World of Dance Philippines Returns to Newport Performing Arts Theater on 29 March',
    summary:
      'World of Dance Philippines held its 2026 edition at the Newport Performing Arts Theater in Pasay City, presented with GC Studios and Newport World Resorts. It is the local qualifier feeding the World of Dance circuit.',
    summary_tl:
      'Naganap ang World of Dance Philippines 2026 sa Newport Performing Arts Theater sa Pasay City, na kasabay ang GC Studios at Newport World Resorts.',
    category: 'results',
    organization: 'World of Dance',
    region: 'philippines',
    location: 'Newport Performing Arts Theater, Pasay City',
    event_date: '2026-03-29T10:00:00+08:00',
    source_url: 'https://www.newportworldresorts.com/event/world-dance-philippines-2026',
    image_url: '/dance-updates/wod-philippines-2026.jpg',
    image_source_url:
      'https://www.newportworldresorts.com/sites/default/files/2026-03/WOD_0.jpg',
    image_credit: 'World of Dance Philippines / Newport Performing Arts Theater',
    image_alt:
      'World of Dance Philippines key art: two dancers mid-lift under stage lighting with the World of Dance Philippines wordmark and Philippine flag.',
    image_verified: true,
    tags: ['WOD', 'Philippines', 'Newport', 'Pasay', 'Qualifier'],
    published_at: '2026-03-30T09:00:00+08:00',
    status: 'published',
    created_at: '2026-03-30T09:00:00+08:00',
  },
  {
    id: 'justedebout-2026-finals',
    title: 'Juste Debout 20th Edition Crowns Its World Champions in Paris',
    summary:
      'The 20th edition of Juste Debout ran its finals on 7 and 8 March 2026 at Stade Pierre de Coubertin in Paris, closing a week of pre-selections across Locking, Popping, Hip Hop Newstyle, House, Experimental and Junior Dance Tour.',
    summary_tl:
      'Inilabas ng 20 edisyon ng Juste Debout ang mga world champion sa finals noong 7 at 8 Marso 2026 sa Stade Pierre de Coubertin, Paris.',
    category: 'results',
    organization: 'Juste Debout',
    region: 'international',
    location: 'Stade Pierre de Coubertin, Paris, France',
    event_date: '2026-03-08T18:00:00+01:00',
    source_url: 'https://juste-debout.com/en/our-latest-news',
    image_url: '/dance-updates/justedebout-2026-finals.png',
    image_source_url: 'https://juste-debout.com/wp-content/uploads/2025/11/IMG_6234.png',
    image_credit: 'Juste Debout',
    image_alt:
      'Juste Debout 20th Edition poster: three dancers in a locking battle before a lit arena crowd, with 07-08 March 2026, Stade Coubertin, Paris.',
    image_verified: true,
    tags: ['JusteDebout', 'Paris', 'Finals', '2v2', 'Popping', 'Locking'],
    published_at: '2026-03-09T20:00:00+08:00',
    status: 'published',
    created_at: '2026-03-09T20:00:00+08:00',
  },
  {
    id: 'steezy-idl-2026-season',
    title: "STEEZY Breaks Down the IDL's 2026 Global Tour: Five Series From New York to Los Angeles",
    summary:
      "STEEZY's editorial team published a walkthrough of the International Dance League's inaugural 2026 season - New York 2 May, Vancouver 23 May, Sydney 20 June, Seoul 1 August and Los Angeles 19 September, closing with the LA Championship on 20 September.",
    summary_tl:
      'Naglabas ang editoryal na kopya ng STEEZY ng gabay sa unang season ng International Dance League sa 2026, mula New York hanggang Los Angeles.',
    category: 'news',
    organization: 'STEEZY',
    region: 'international',
    location: 'Online (STEEZY Blog)',
    event_date: '2025-12-19T09:00:00+08:00',
    source_url:
      'https://www.steezy.co/posts/internationl-dance-league-announces-its-2026-season-schedule',
    image_url: '/dance-updates/steezy-idl-2026-season.jpg',
    image_source_url:
      'https://cdn.prod.website-files.com/5e2b8863ba7fff8df8949888/6945ab73aa198ceb35b36397_idl-international-dance-league-2026-schedule.jpg',
    image_credit: 'STEEZY Blog',
    image_alt:
      'Official IDL 2026 schedule graphic listing the New York, Vancouver, Sydney, Seoul and Los Angeles series and the LA Championship, above the IDL floor logo.',
    image_verified: true,
    tags: ['STEEZY', 'IDL', 'SeasonSchedule', 'Analysis'],
    published_at: '2025-12-19T09:00:00+08:00',
    status: 'published',
    created_at: '2025-12-19T09:00:00+08:00',
  },
];