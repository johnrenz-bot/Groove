/**
 * Curated rehearsal studios for the Studio Locator.
 *
 * WHY A CURATED DATASET
 *   The locator's other source, OpenStreetMap via the Overpass API, has no
 *   record of any of these six venues — a live query over San Jose del Monte
 *   returned zero of them. They come instead from the Groove PH Google Maps
 *   reference (https://maps.app.goo.gl/cjvxNogVCiqhU9ts5), which is a Maps
 *   search for "san jose del monte dance bulacan studio".
 *
 *   That reference was read by hand (it is a user-provided source, not a
 *   scraper): each coordinate below is transcribed from the place URL Google
 *   published for that result. Addresses are shown ONLY where the studio itself
 *   publishes one (Facebook / Instagram / its own site); otherwise they are
 *   null.
 *
 *   This file is the "small, maintainable curated dataset" from the feature
 *   spec. To change a listing, edit the row here. To mark a venue as
 *   Groove-verified instead, move its row into `public.studios` (the
 *   RLS-protected, admin-writable table created by supabase/studios.sql) — the
 *   locator renders either source identically except for its label.
 *
 * WHAT WE DELIBERATELY DON'T SHOW
 *   No ratings, phone numbers, or opening hours. None were verified, and
 *   showing unverified business details on a map is how maps lie.
 */

export interface CuratedStudio {
  /** Stable id, used by the map/list to key markers. */
  id: string;
  name: string;
  /** Only set when the studio publishes an address itself. */
  address: string | null;
  latitude: number;
  longitude: number;
}

export const CURATED_STUDIOS: CuratedStudio[] = [
  {
    id: 'curated-dojo-dance-studio',
    name: 'Dojo Dance Studio',
    // Address as published by the studio on its own and partners' public pages:
    // "Along Quirino Hiway Brgy. Tungkong Mangga SJDM."
    address: 'Along Quirino Highway, Brgy. Tungkong Mangga, San Jose del Monte, Bulacan',
    latitude: 14.7912125,
    longitude: 121.0744362,
  },
  {
    id: 'curated-onse-academy',
    name: 'Onse Academy',
    // Onse Academy holds its classes at Dojo Dance Studio (Tungkong Mangga),
    // and Maps distinguishes the two venues separately at the same building.
    address: 'Along Quirino Highway, Brgy. Tungkong Mangga, San Jose del Monte, Bulacan',
    latitude: 14.7912122,
    longitude: 121.0744437,
  },
  {
    id: 'curated-esr-dance-studio',
    name: 'ESR Dance Studio',
    // Barangay as published by the studio ("open Sapang Palay, San Jose del
    // Monte, Philippines, 3023"). No street number is published, so there is
    // no more specific address to show.
    address: 'Sapang Palay, San Jose del Monte, Bulacan',
    latitude: 14.862241,
    longitude: 121.0554981,
  },
  {
    id: 'curated-align-studio-sta-maria',
    name: 'Align Studio – Sta. Maria Bulacan Branch',
    // Street address published on the studio's own Instagram bio:
    // "37 Pulong Buhangin, Santa Maria, Bulacan".
    address: '37 Pulong Buhangin, Santa Maria, Bulacan',
    latitude: 14.8533596,
    longitude: 120.9862778,
  },
  {
    id: 'curated-kalatas-dance-ensemble',
    name: 'Kalatas Dance Ensemble',
    // Community-based performing arts group from San Jose del Monte. No
    // street address is published, so the row carries only its mapped point.
    address: null,
    latitude: 14.8279974,
    longitude: 121.0407993,
  },
  {
    id: 'curated-eyesonhigh-dance-studio',
    name: 'EYESONHIGH DANCE STUDIO',
    // No street address is published; the row carries only its mapped point.
    address: null,
    latitude: 14.7938034,
    longitude: 121.0055674,
  },
];