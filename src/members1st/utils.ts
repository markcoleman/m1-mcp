/**
 * Parses an environment variable as a boolean.
 * Accepts "1" or "true" (case-insensitive) as true values.
 * @param name - Environment variable name
 * @returns true if the value is "1" or "true", false otherwise
 */
export function envBool(name: string): boolean {
  const v = process.env[name];
  if (!v) return false;
  return v === "1" || v.toLowerCase() === "true";
}

/**
 * Parses an environment variable as a number with a fallback.
 * @param name - Environment variable name
 * @param fallback - Default value if variable is not set or invalid
 * @returns Parsed number or fallback value
 */
export function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}
