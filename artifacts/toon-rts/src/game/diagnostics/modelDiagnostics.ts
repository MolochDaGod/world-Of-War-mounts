/**
 * A deduplicated, non-fatal runtime diagnostic channel for character assets.
 * Rendering can keep its fallback mesh while developers get a specific reason
 * instead of a silent missing weapon or permanent idle pose.
 */
const reported = new Set<string>();

export function reportModelDiagnostic(key: string, message: string) {
  if (reported.has(key)) return;
  reported.add(key);
  console.warn(`[RaceWars model check] ${message}`);
}