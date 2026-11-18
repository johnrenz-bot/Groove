-- Seed: Dance League registry (dance_orgs)
--
-- Mirrors features/dance/data/leagues.ts exactly. Every row was verified
-- against its official website on 2026-11-16 (IDs, names, sites, socials).
-- battle-of-the-year stays needs-info because its domain could not be reached
-- on 2026-11-16; it must not appear on the public marquee until re-verified.
--
-- Idempotent: safe to run more than once (ON CONFLICT (slug) DO UPDATE).
-- Logos are local /logos/Dance-Leagues/* files vendored with the app build.

WITH reg(slug, name, scope, disciplines, country, website_url, logo_url, logo_source_url, socials, status, sort_order, fetched_at, last_verified_at) AS (
  VALUES
    ('idl', 'International Dance League', 'international', ARRAY['hip-hop','street','choreo'], 'US',
     'https://www.idl.pro/', '/logos/Dance-Leagues/idl.png', 'https://www.idl.pro/', '{}'::jsonb,
     'approved', 1, '2026-11-16T00:00:00.000Z', '2026-11-16T00:00:00.000Z'),
    ('hhi', 'Hip Hop International', 'international', ARRAY['hip-hop','street'], 'US',
     'https://www.hiphopinternational.com/', '/logos/Dance-Leagues/hhi.png', 'https://hiphopinternational.com/',
     '{"youtube":"https://www.youtube.com/officialhhi","instagram":"https://www.instagram.com/officialhhi","tiktok":"https://www.tiktok.com/@officialhhi"}'::jsonb,
     'approved', 2, '2026-11-16T00:00:00.000Z', '2026-11-16T00:00:00.000Z'),
    ('world-of-dance', 'World of Dance Events', 'international', ARRAY['hip-hop','choreo','street'], 'US',
     'https://www.worldofdance.com/', '/logos/Dance-Leagues/world-of-dance.png', 'https://www.worldofdance.com/',
     '{"youtube":"https://www.youtube.com/@worldofdance","instagram":"https://www.instagram.com/worldofdance","tiktok":"https://www.tiktok.com/@worldofdance"}'::jsonb,
     'approved', 3, '2026-11-16T00:00:00.000Z', '2026-11-16T00:00:00.000Z'),
    ('red-bull-dance-your-style', 'Red Bull Dance Your Style', 'international', ARRAY['hip-hop','breaking','street'], 'AT',
     'https://www.redbull.com/int-en/events/red-bull-dance-your-style-world-final-2026-zurich', '/logos/Dance-Leagues/red-bull-dance-your-style.png',
     'https://www.redbull.com/int-en/events/red-bull-dance-your-style-world-final-2026-zurich', '{}'::jsonb,
     'approved', 4, '2026-10-14T04:23:08.000Z', '2026-10-14T04:23:08.000Z'),
    ('juste-debout', 'Juste Debout', 'international', ARRAY['hip-hop','street'], 'FR',
     'https://juste-debout.com/', '/logos/Dance-Leagues/juste-debout.svg', 'https://juste-debout.com/',
     '{"instagram":"https://www.instagram.com/justedebout_officiel/","youtube":"https://www.youtube.com/@justedeboutofficiel"}'::jsonb,
     'approved', 5, '2026-11-16T00:00:00.000Z', '2026-11-16T00:00:00.000Z'),
    ('udo', 'United Dance Organisation', 'international', ARRAY['hip-hop','breaking','street'], 'GB',
     'https://www.udostreetdance.com/', '/logos/Dance-Leagues/udo.png', 'https://www.udostreetdance.com/',
     '{"youtube":"https://www.youtube.com/user/UDOtvOnline","instagram":"https://www.instagram.com/udo_asia_pacific"}'::jsonb,
     'approved', 6, '2026-11-16T00:00:00.000Z', '2026-11-16T00:00:00.000Z'),
    ('wdsf', 'World DanceSport Federation', 'international', ARRAY['dancesport','breaking'], 'CH',
     'https://www.worlddancesport.org/', '/logos/Dance-Leagues/wdsf.svg', 'https://www.worlddancesport.org/',
     '{"instagram":"https://www.instagram.com/_breakingforgold","youtube":"https://www.youtube.com/@breakingforgold"}'::jsonb,
     'approved', 7, '2026-11-16T00:00:00.000Z', '2026-11-16T00:00:00.000Z'),
    ('summer-dance-forever', 'Summer Dance Forever', 'international', ARRAY['hip-hop','street'], 'NL',
     'https://www.summerdanceforever.com/', '/logos/Dance-Leagues/summer-dance-forever.png', 'https://www.summerdanceforever.com/', '{}'::jsonb,
     'approved', 8, '2026-11-16T00:00:00.000Z', '2026-11-16T00:00:00.000Z'),
    ('steezy', 'STEEZY Studio', 'international', ARRAY['street','hip-hop','k-pop cover'], 'US',
     'https://www.steezy.co/', '/logos/Dance-Leagues/steezy.svg', 'https://www.steezy.co/',
     '{"youtube":"https://www.youtube.com/steezystudio","instagram":"https://www.instagram.com/steezystudio/","tiktok":"https://www.tiktok.com/@steezystudio"}'::jsonb,
     'approved', 9, '2026-11-16T00:00:00.000Z', '2026-11-16T00:00:00.000Z'),
    ('hhi-philippines', 'Hip Hop International Philippines', 'philippines', ARRAY['hip-hop','street'], 'PH',
     'https://hhiphilippines.com/', '/logos/Dance-Leagues/hhi-philippines.png', 'https://hhiphilippines.com/',
     '{"youtube":"https://www.youtube.com/hiphopinternationalphilippines","instagram":"https://www.instagram.com/hhiphilippines/","tiktok":"https://www.tiktok.com/@hhiphilippines"}'::jsonb,
     'approved', 10, '2026-11-16T00:00:00.000Z', '2026-11-16T00:00:00.000Z'),
    ('red-bull-dance-your-style-philippines', 'Red Bull Dance Your Style Philippines', 'philippines', ARRAY['hip-hop','breaking','street'], 'PH',
     'https://www.redbull.com/ph-en/events/dance-your-style-philippines', '/logos/Dance-Leagues/red-bull-dance-your-style.png',
     'https://www.redbull.com/ph-en/events/dance-your-style-philippines', '{}'::jsonb,
     'approved', 11, '2026-10-14T04:23:08.000Z', '2026-10-14T04:23:08.000Z'),
    ('philippine-dancesport', 'Philippine DanceSport Federation, Inc.', 'philippines', ARRAY['dancesport'], 'PH',
     'https://philippinedancesport.com/', '/logos/Dance-Leagues/philippine-dancesport.png', 'https://philippinedancesport.com/',
     '{"youtube":"https://www.youtube.com/dancesporttv"}'::jsonb,
     'approved', 12, '2026-11-16T00:00:00.000Z', '2026-11-16T00:00:00.000Z'),
    ('battle-of-the-year', 'Battle of the Year', 'international', ARRAY['hip-hop','breaking'], 'DE',
     'https://battleoftheyear.de/', '/logos/Dance-Leagues/battle-of-the-year.jpg', 'https://battleoftheyear.de/', '{}'::jsonb,
     'needs-info', 99, '2026-11-16T00:00:00.000Z', '2026-11-16T00:00:00.000Z')
)
INSERT INTO dance_orgs (name, slug, website_url, logo_url, logo_source_url, logo_verified, sort_order, created_at, updated_at, scope, disciplines, country, socials, source_url, status, fetched_at, last_verified_at)
SELECT name, slug, website_url, logo_url, logo_source_url, true, sort_order, NOW(), NOW(), scope, disciplines, country, socials, logo_source_url, status, fetched_at::timestamptz, last_verified_at::timestamptz
FROM reg
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  website_url = EXCLUDED.website_url,
  logo_url = EXCLUDED.logo_url,
  logo_source_url = EXCLUDED.logo_source_url,
  logo_verified = EXCLUDED.logo_verified,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW(),
  scope = EXCLUDED.scope,
  disciplines = EXCLUDED.disciplines,
  country = EXCLUDED.country,
  socials = EXCLUDED.socials,
  source_url = EXCLUDED.source_url,
  status = EXCLUDED.status,
  fetched_at = EXCLUDED.fetched_at,
  last_verified_at = EXCLUDED.last_verified_at;

-- Remove the misfiled crew from the league marquee (kept, just needs-info).
UPDATE dance_orgs SET status = 'needs-info' WHERE slug = 'the-royal-family';
