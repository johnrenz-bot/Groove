/**
 * Checks if a user message is asking about the GroovePH platform itself.
 * Returns true only for explicit platform/about queries, not performing-arts words.
 */

const PLATFORM_KEYWORDS = [
  // Exact brand terms
  /\bgrooveph\b/i,
  /\bgroove\s+ph\b/i,
  /\bgroove\s+system\b/i,
  /\bgroove\s+yy\b/i,
  /\bgrooveyy\b/i,
  /\bgroovey\s+ph\b/i,
  // Generic platform references (word-boundary safe)
  /\bthis\s+app\b/i,
  /\bthis\s+platform\b/i,
  /\babout\s+groove\b/i,
];

/**
 * Keywords that indicate the user is asking about Grooveyy AI specifically
 * (the standalone chatbot site at grooveyph.vercel.app with "y")
 */
const GROOVEYY_KEYWORDS = [
  /\bgrooveyy\b/i,
  /\bgroovey\s+ph\b/i,
  /\bgrooveyph\b/i,
];

export function isAboutPlatformMessage(text: string): boolean {
  if (!text) return false;
  const normalized = text.trim().toLowerCase();
  return PLATFORM_KEYWORDS.some((re) => re.test(normalized));
}

export function isAboutGrooveyyMessage(text: string): boolean {
  if (!text) return false;
  const normalized = text.trim().toLowerCase();
  return GROOVEYY_KEYWORDS.some((re) => re.test(normalized));
}