// The only consumers of the feature barrel are app/layout.tsx (MusicPlayerProvider)
// and, historically, re-exports nothing else uses. The legacy `./types` and
// `./config/genres` exports had no consumers anywhere in the app or scripts.
export * from './context/MusicPlayerContext';
export * from './data/seed';
