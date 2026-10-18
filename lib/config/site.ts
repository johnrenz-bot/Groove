/**
 * Site configuration constants.
 * Single source for the production URL and other site-wide config.
 */

// Production URL for GroovePH (deployed on Vercel)
export const GROOVEPH_URL = "https://grooveyph.vercel.app/";

// Fallback for local development
export const getSiteUrl = (): string => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};