/**
 * Curated rehearsal studios for the Studio Locator.
 *
 * WHY A CURATED DATASET
 *   The primary source is the admin-managed `public.studios` table in Supabase.
 *   These reviewed points are the fallback while that table is still empty,
 *   and each one comes from the Groove PH Google Maps reference
 *   (https://maps.app.goo.gl/cjvxNogVCiqhU9ts5), a Maps search for
 *   "san jose del monte dance bulacan studio".
 *
 *   That reference was read by hand (it is a user-provided source, not a
 *   scraper): each coordinate below is transcribed from the place URL Google
 *   published for that result. Addresses are shown ONLY where the studio itself
 *   publishes one (Facebook / Instagram / its own site); otherwise they are
 *   null.
 *
 *   Additional rows below were verified against the business's own public
 *   page (Facebook, Instagram, or official site) for the address, and against
 *   a public place listing (Google Maps place page, Waze, or an OpenStreetMap
 *   mirror) for the coordinate. No coordinate is estimated from an address.
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
  /** Optional image path for landing page display. */
  image?: string;
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
    image: '/image/wc/dance.jpg',
  },
  {
    id: 'curated-onse-academy',
    name: 'Onse Academy',
    // Onse Academy holds its classes at Dojo Dance Studio (Tungkong Mangga),
    // and Maps distinguishes the two venues separately at the same building.
    address: 'Along Quirino Highway, Brgy. Tungkong Mangga, San Jose del Monte, Bulacan',
    latitude: 14.7912122,
    longitude: 121.0744437,
    image: '/image/wc/dance.jpg',
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
    image: '/image/wc/dance.jpg',
  },
  {
    id: 'curated-align-studio-sta-maria',
    name: 'Align Studio – Sta. Maria Bulacan Branch',
    // Street address published on the studio's own Instagram bio:
    // "37 Pulong Buhangin, Santa Maria, Bulacan".
    address: '37 Pulong Buhangin, Santa Maria, Bulacan',
    latitude: 14.8533596,
    longitude: 120.9862778,
    image: '/image/wc/dance.jpg',
  },
  {
    id: 'curated-kalatas-dance-ensemble',
    name: 'Kalatas Dance Ensemble',
    // Community-based performing arts group from San Jose del Monte. No
    // street address is published, so the row carries only its mapped point.
    address: null,
    latitude: 14.8279974,
    longitude: 121.0407993,
    image: '/image/wc/dance.jpg',
  },
  {
    id: 'curated-eyesonhigh-dance-studio',
    name: 'EYESONHIGH DANCE STUDIO',
    // No street address is published; the row carries only its mapped point.
    address: null,
    latitude: 14.7938034,
    longitude: 121.0055674,
    image: '/image/wc/dance.jpg',
  },
  {
    id: 'curated-anima-dance-studio',
    name: 'Anima Dance Studio',
    // Address published on the studio's Instagram and Facebook pages.
    address:
      '3rd Floor, RnW Building, MacArthur Highway, Bunlo, Bocaue, Bulacan',
    // Public place listing: maptons.com/p/10886593561 (14.7819783, 120.9344862).
    latitude: 14.7819783,
    longitude: 120.9344862,
    image: '/image/wc/dance.jpg',
  },
  {
    id: 'curated-stc-performing-arts-center',
    name: 'STC Performing Arts Center',
    // Address published on the studio's Facebook page.
    address:
      '2F JM Mendoza Building, KM 35 MacArthur Highway, Abangan Norte, Marilao, Bulacan',
    // Published Google Maps place page: maps.app.goo.gl/6wf9BstdjcGpahrJ8.
    latitude: 14.7914752,
    longitude: 120.9892864,
    image: '/image/wc/dance.jpg',
  },
  {
    id: 'curated-cuts-curves-movements',
    name: 'Cuts-Curves and Movements Fitness Dance Studio',
    // Address published on the studio's Instagram and Waze place page.
    address:
      '714 Talisay St. cor. Bancal Extension, Meycauayan, Bulacan',
    // Public Waze place page coordinate (place.ChIJ_dE4pb6zlzMRiQF0VrqY5BE).
    latitude: 14.720947,
    longitude: 120.9609599,
    image: '/image/wc/dance.jpg',
  },
  {
    id: 'curated-kidlat-dance-studio',
    name: 'Kidlat Dance Studio',
    // Address published on the studio's official site and ClassPass listing.
    address:
      'Unit 202 & 203, Sunrise Condominium I, Ortigas Avenue, San Juan City, Metro Manila',
    // Public place listing: maptons.com/p/10741843318 (14.6029310, 121.0456313).
    latitude: 14.602931,
    longitude: 121.0456313,
    image: '/image/wc/dance.jpg',
  },
];