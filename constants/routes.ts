/**
 * Canonical route paths. Prefer these over string literals in new code.
 * Not every string in the app is listed — only the routes referenced in more
 * than one place. Route groups (`(public)`, `(client)`, …) do not appear in
 * URLs, so paths here are the public URLs.
 */
export const ROUTES = {
  home: '/',
  login: '/login',
  registerClient: '/register/client',
  registerCoach: '/register/coach',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  messages: '/messages',
  users: '/users',
  about: '/about',
  faq: '/faq',
  terms: '/terms',
  privacy: '/privacy',
  client: {
    home: '/client/home',
    profile: '/client/profile',
    editProfile: '/client/profile/edit',
    appointments: '/client/appointments',
    calendar: '/client/calendar',
    talent: '/client/talent',
    settings: '/client/settings',
    groovey: '/client/groovey',
  },
  coach: {
    home: '/coach/home',
    profile: '/coach/profile',
    editProfile: '/coach/profile/edit',
    appointments: '/coach/appointments',
    calendar: '/coach/calendar',
    talents: '/coach/talents',
    settings: '/coach/settings',
    groovey: '/coach/groovey',
  },
  admin: {
    dashboard: '/admin/dashboard',
    users: '/admin/users',
    coaches: '/admin/coaches',
    clients: '/admin/clients',
    bookings: '/admin/bookings',
    verifications: '/admin/verifications',
    settings: '/admin/settings',
  },
} as const;
