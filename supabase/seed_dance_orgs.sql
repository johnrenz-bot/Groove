-- Seed: Dance Organizations (dance_orgs)
-- ============================================================================
-- Seeds the organization rows shown in the official-logo carousel with
-- logo_url = NULL and logo_verified = FALSE, so the carousel renders the
-- text-pill fallback (OrgLogoBar style) before the weekly logos:sync run
-- downloads and verifies the official logos.
--
-- SOURCE OF TRUTH: scripts/sync-dance-logos.ts (the ORGS list there). This seed
-- must stay in sync with that list — same slugs, names, website_url, and order.
-- Running `npm run logos:sync` or the /api/cron/dance-logos cron populates
-- logo_url / logo_source_url / logo_verified.
--
-- On conflict (slug) only name / website_url / sort_order are refreshed, so an
-- existing verified logo (logo_url / logo_source_url / logo_verified) is
-- preserved when the seed is re-run after a sync.

INSERT INTO dance_orgs (name, slug, website_url, sort_order, logo_verified)
VALUES
  ('IDL (International Dance League)', 'idl', 'https://www.thedancelebague.com', 0, false),
  ('STEEZY', 'steezy', 'https://www.steezy.com', 1, false),
  ('World of Dance', 'world-of-dance', 'https://www.worldofdance.com', 2, false),
  ('Hip Hop International', 'hhi', 'https://www.hiphopinternational.com', 3, false),
  ('Red Bull Dance Your Style', 'red-bull-dance-your-style', 'https://www.redbull.com/danceyourstyle', 4, false),
  ('Juste Debout', 'juste-debout', 'https://www.justedebout.com', 5, false),
  ('UDO (United Dance Organisation)', 'udo', 'https://www.udodanceworld.com', 6, false),
  ('Battle of the Year', 'battle-of-the-year', 'https://www.battleoftheyear.net', 7, false),
  ('WDSF (World DanceSport Federation)', 'wdsf', 'https://www.worlddancesport.org', 8, false),
  ('Hip Hop International Philippines', 'hhi-philippines', 'https://hhiphilippines.com', 9, false),
  ('Philippine DanceSport Federation', 'philippine-dancesport', 'https://philippinedancesport.com', 10, false)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  website_url = EXCLUDED.website_url,
  sort_order = EXCLUDED.sort_order;
