export async function register() {
  // Only validate on the Node server runtime, not the edge or the client.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { validateEnv } = await import('./lib/config/env');
      validateEnv();
    } catch (error) {
      // Surface misconfiguration loudly at boot without crashing the process in
      // dev. In production validateEnv already throws for missing required vars.
      console.error('[instrumentation] Environment validation failed:', error);
    }
  }
}