/**
 * Featured Registration Locations
 *
 * The primary location is permanent: San Jose del Monte, Bulacan, Philippines.
 * A secondary featured location can be configured by setting SECONDARY_FEATURED_LOCATION
 * to a location object, or left as null/undefined to show only the primary.
 *
 * Both locations appear in registration subtext and success messages when configured
 * and different from the primary.
 */

export interface FeaturedLocation {
  /** Display name (e.g., "San Jose del Monte, Bulacan") */
  displayName: string;
  /** Short name for compact UI (e.g., "SJDM") */
  shortName: string;
  /** Full address summary for success messages */
  addressSummary: string;
  /** City name for AddressSelector integration */
  cityName: string;
  /** Province name */
  provinceName: string;
  /** Region name */
  regionName: string;
  /** Postal codes */
  postalCodes: string[];
  /** Whether this is the primary (permanent) location */
  isPrimary: boolean;
}

/** Permanent primary featured location — San Jose del Monte, Bulacan, Philippines */
export const PRIMARY_FEATURED_LOCATION: FeaturedLocation = {
  displayName: 'San Jose del Monte, Bulacan',
  shortName: 'SJDM',
  addressSummary: 'San Jose del Monte, Bulacan, Philippines',
  cityName: 'San Jose del Monte',
  provinceName: 'Bulacan',
  regionName: 'Region III (Central Luzon)',
  postalCodes: ['3023', '3024'],
  isPrimary: true,
};

/**
 * Secondary featured location configuration.
 *
 * To enable a second featured location, replace this with a valid FeaturedLocation object.
 * Examples:
 *
 * export const SECONDARY_FEATURED_LOCATION: FeaturedLocation | null = {
 *   displayName: 'Quezon City, Metro Manila',
 *   shortName: 'QC',
 *   addressSummary: 'Quezon City, Metro Manila, Philippines',
 *   cityName: 'Quezon City',
 *   provinceName: 'Metro Manila',
 *   regionName: 'National Capital Region',
 *   postalCodes: ['1100', '1101', '1102', '1103', '1104', '1105'],
 *   isPrimary: false,
 * };
 *
 * To disable, set to null or undefined.
 */
export const SECONDARY_FEATURED_LOCATION: FeaturedLocation | null = null;

/** All currently active featured locations (primary + secondary if configured and distinct) */
export function getFeaturedLocations(): FeaturedLocation[] {
  const locations: FeaturedLocation[] = [PRIMARY_FEATURED_LOCATION];

  if (
    SECONDARY_FEATURED_LOCATION &&
    SECONDARY_FEATURED_LOCATION.displayName !== PRIMARY_FEATURED_LOCATION.displayName &&
    SECONDARY_FEATURED_LOCATION.cityName !== PRIMARY_FEATURED_LOCATION.cityName
  ) {
    locations.push(SECONDARY_FEATURED_LOCATION);
  }

  return locations;
}

/** Check if secondary location is active and distinct from primary */
export function hasSecondaryFeaturedLocation(): boolean {
  return (
    SECONDARY_FEATURED_LOCATION !== null &&
    SECONDARY_FEATURED_LOCATION !== undefined &&
    SECONDARY_FEATURED_LOCATION.displayName !== PRIMARY_FEATURED_LOCATION.displayName &&
    SECONDARY_FEATURED_LOCATION.cityName !== PRIMARY_FEATURED_LOCATION.cityName
  );
}

/** Get display string for featured locations in subtext/UI */
export function getFeaturedLocationsDisplay(): string {
  const locations = getFeaturedLocations();
  if (locations.length === 1) {
    return locations[0].displayName;
  }
  return `${locations[0].displayName} & ${locations[1].displayName}`;
}

/** Get combined address summary for success messages */
export function getFeaturedLocationsAddressSummary(): string {
  const locations = getFeaturedLocations();
  if (locations.length === 1) {
    return locations[0].addressSummary;
  }
  return `${locations[0].addressSummary} / ${locations[1].addressSummary}`;
}