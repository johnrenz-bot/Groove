/**
 * The public-facing columns of public.profiles.
 *
 * PRIVACY BOUNDARY: public surfaces (follow lists, the /users directory, the
 * public profile page) must select ONLY these columns. The RLS policy on
 * public.profiles is row-level (`FOR SELECT USING (true)`), so every column —
 * including email, contact phone, birthdate and street — is readable by any
 * client that asks for it. Whitelisting here is what keeps that data out of
 * public responses until a column-level or view-based hardening migration is
 * applied (see supabase/migrations/15_public_profile_view.sql).
 *
 * This module has NO 'use client' directive on purpose: server routes and
 * client components both import it. Putting the list inside a 'use client'
 * module would turn it into an opaque client reference on the server.
 */

export const PUBLIC_PROFILE_COLUMNS = [
  'id',
  'firstname',
  'lastname',
  'username',
  'photo_url',
  'role',
  'city_name',
  'province_name',
  'account_verified',
  'created_at',
] as const;

/** The subset of PUBLIC_PROFILE_COLUMNS that follow-list rows render. */
export const FOLLOW_PERSON_COLUMNS = [
  'id',
  'firstname',
  'lastname',
  'username',
  'photo_url',
  'role',
  'city_name',
  'province_name',
  'account_verified',
] as const;