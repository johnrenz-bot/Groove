/**
 * Site configuration constants.
 * Single source for the production URL and other site-wide config.
 */

// Production URL for GroovePH (the capstone platform, no "y")
export const GROOVEPH_URL = "https://grooveph.vercel.app/";

// Production URL for Grooveyy AI (the standalone chatbot site, with "y")
export const GROOVEYY_URL = "https://grooveyph.vercel.app/";

// Fallback for local development
export const getSiteUrl = (): string => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};