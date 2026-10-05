/**
 * Extensible Skills & Genres Configuration for GROOVE SYSTEM
 *
 * This configuration defines the performing arts disciplines and their corresponding
 * genres. It is extensible so administrators or developers can easily add new skills
 * or genres without altering component architecture.
 */

export interface SkillsConfig {
  [skill: string]: string[];
}

export interface StructuredSkillsData {
  skills: {
    [skill: string]: string[];
  };
}

export const DEFAULT_SKILLS_AND_GENRES: SkillsConfig = {
  Dance: [
    'Hip-Hop',
    'Ballet',
    'Contemporary',
    'Jazz',
    'Modern',
    'Ballroom',
    'Salsa',
    'Bachata',
    'Tango',
    'Tap',
    'Street Dance',
    'Breaking',
    'K-Pop',
    'Bollywood',
    'Latin',
    'Afro',
    'Dancehall',
    'Jazz Funk',
  ],
  Singing: [
    'Pop',
    'Rock',
    'R&B',
    'Hip-Hop / Rap',
    'Soul',
    'Jazz',
    'Classical',
    'Opera',
    'Country',
    'Gospel',
    'Musical Theater',
    'Latin',
    'Reggae',
    'K-Pop',
    'J-Pop',
    'OPM / P-Pop',
    'Afrobeats',
    'Indie',
  ],
  Theater: [
    'Drama',
    'Comedy',
    'Musical Theater',
    'Tragedy',
    'Romance',
    'Melodrama',
    'Farce',
    'Satire',
    'Improv',
    'Shakespearean',
    'Opera',
    'Cabaret',
    'Physical Theater',
  ],
  Acting: [
    'Film',
    'Television',
    'Stage',
    'Voice Acting',
    'Musical Theater',
    'Comedy',
    'Drama',
    'Action',
    'Romance',
    'Horror',
    'Thriller',
    'Character Acting',
    'Improvisation',
    'Commercial',
    'Motion Capture',
  ],
};

/**
 * Returns the list of all available skill categories.
 */
export function getAvailableSkills(config: SkillsConfig = DEFAULT_SKILLS_AND_GENRES): string[] {
  return Object.keys(config);
}

/**
 * Returns the list of genres for a specific skill.
 */
export function getGenresForSkill(
  skill: string,
  config: SkillsConfig = DEFAULT_SKILLS_AND_GENRES
): string[] {
  return config[skill] || [];
}

/**
 * Validates that:
 * 1. A skill is selected.
 * 2. At least one genre is chosen for the skill.
 * 3. If "Other" is selected, custom genre inputs are not empty.
 */
export function validateSkillsSelection(
  skillOrSkills: string | string[],
  genresOrRecord: string[] | Record<string, string[]>,
  isOtherSelected?: boolean,
  customGenres?: string[]
): { valid: boolean; error: string | null } {
  if (typeof skillOrSkills === 'string') {
    const skill = skillOrSkills.trim();
    if (!skill) {
      return { valid: false, error: 'Please select a skill or discipline.' };
    }
    const genres = Array.isArray(genresOrRecord)
      ? genresOrRecord
      : (genresOrRecord[skill] || []);

    if (isOtherSelected) {
      const customs = (customGenres || []).map((g) => g.trim());
      if (customs.length === 0 || customs.every((g) => g.length === 0)) {
        return {
          valid: false,
          error: 'Please specify your custom genre under "Other" before proceeding.',
        };
      }
      if (customs.some((g) => g.length === 0)) {
        return {
          valid: false,
          error: 'Please fill in all custom genre fields or remove blank ones.',
        };
      }
    }

    const totalCount =
      genres.length +
      (isOtherSelected ? (customGenres || []).filter((g) => g.trim().length > 0).length : 0);

    if (totalCount === 0) {
      return {
        valid: false,
        error: `Please select at least one genre for "${skill}".`,
      };
    }

    return { valid: true, error: null };
  }

  // Fallback for legacy array format
  if (!skillOrSkills || skillOrSkills.length === 0) {
    return { valid: false, error: 'Please select at least one skill or discipline.' };
  }

  const record = Array.isArray(genresOrRecord) ? {} : genresOrRecord;
  for (const s of skillOrSkills) {
    const gList = record[s];
    if (!gList || gList.length === 0) {
      return {
        valid: false,
        error: `Please select at least one genre for "${s}".`,
      };
    }
  }

  return { valid: true, error: null };
}
