/**
 * GROOVE loading copy — one vocabulary for every surface.
 *
 * The splash sequence (Preparing → Tuning → Setting → Bringing → Almost)
 * is the cinematic narrative. The contextual lists reuse the same voice
 * for auth, dashboard and upload states so nothing reads off-brand.
 */

export const GROOVE_LOADING_MESSAGES = [
  'Preparing your creative space…',
  'Preparing your experience…',
  'Tuning the stage…',
  'Setting the rhythm…',
  'Bringing GROOVE to life…',
  'Loading something amazing…',
  'Almost ready…',
] as const;

export const GROOVE_LOADING_SUBTITLES = [
  'Warming up rehearsal halls',
  'Cueing lights & sound',
  'Choreographing your next step',
  'Polishing the final details',
  'The curtain is about to rise',
] as const;

export const LOADING_MESSAGES_BY_CONTEXT = {
  splash: GROOVE_LOADING_MESSAGES,
  route: ['Setting the rhythm…', 'Bringing GROOVE to life…', 'Almost ready…'],
  auth: ['Verifying your identity…', 'Tuning your profile…', 'Almost ready…'],
  register: ['Creating your creative space…', 'Casting your disciplines…', 'Almost ready…'],
  dashboard: ['Preparing your dashboard…', 'Setting the rhythm…', 'Almost ready…'],
  data: ['Gathering the ensemble…', 'Tuning the details…'],
  upload: ['Uploading your take…', 'Polishing the edit…'],
  processing: ['Polishing the performance…', 'Setting the final lights…'],
  booking: ['Securing your spot…', 'Confirming the schedule…'],
} as const;

export type LoadingContext = keyof typeof LOADING_MESSAGES_BY_CONTEXT;

/** Pick the message list for a context, falling back to the splash narrative. */
export function messagesForContext(context: LoadingContext): string[] {
  return [...LOADING_MESSAGES_BY_CONTEXT[context]];
}
