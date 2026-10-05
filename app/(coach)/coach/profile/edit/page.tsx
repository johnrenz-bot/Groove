import { redirect } from 'next/navigation';

/**
 * Profile editing now happens in place on the Profile page, using the same
 * shared form sections as Registration. This route is kept as a redirect so
 * existing links (the navbar "Account Settings" entry, bookmarks) keep working.
 */
export default function CoachProfileEditRedirect() {
  redirect('/coach/profile');
}