import { z } from 'zod';

/**
 * Centralised, validated view of the application's environment variables.
 *
 * Only the variables that are genuinely required for the app to boot are marked
 * as required. Optional integrations (AI providers, email, maps, cron) are
 * validated as optional strings so a missing key degrades gracefully instead of
 * crashing the whole process.
 *
 * The schema is evaluated lazily through `validateEnv()` so importing this module
 * never throws during a client bundle or a build step that only needs types.
 */

const envSchema = z.object({
  // Supabase (public, required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  // Supabase (server-only, optional — absence degrades to RLS-scoped access)
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  // Admin
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSCODE: z.string().optional(),
  // AI / integrations (all optional)
  OPENROUTER_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  INGEST_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_ADDRESS: z.string().optional(),
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

/**
 * Validates `process.env` against the schema. Throws in production when a
 * required variable is missing/invalid; warns otherwise. Result is cached.
 */
export function validateEnv(): AppEnv {
  if (cached) return cached;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Invalid environment configuration: ${issues}`);
    }
    // eslint-disable-next-line no-console
    console.warn(`[env] Invalid environment configuration: ${issues}`);
    // Fall back to a best-effort view so dev keeps working.
    cached = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') ?? 'development',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      ADMIN_EMAIL: process.env.ADMIN_EMAIL,
      ADMIN_PASSCODE: process.env.ADMIN_PASSCODE,
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      INGEST_API_KEY: process.env.INGEST_API_KEY,
      CRON_SECRET: process.env.CRON_SECRET,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      RESEND_FROM_ADDRESS: process.env.RESEND_FROM_ADDRESS,
      GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    };
    return cached;
  }

  cached = result.data;
  return cached;
}

/**
 * Non-throwing accessor used by client-safe code paths. Returns null when
 * validation fails instead of throwing.
 */
export function getEnv(): AppEnv | null {
  try {
    return validateEnv();
  } catch {
    return null;
  }
}