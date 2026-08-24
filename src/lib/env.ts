import "server-only";

/**
 * Lazy env access. Reading at call time rather than module load keeps `next build`
 * working without a populated environment, and makes a missing variable fail on the
 * one route that needs it instead of taking the whole deploy down.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function optionalEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}
