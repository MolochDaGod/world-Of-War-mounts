let fallbackCounter = 0;

/**
 * Browser-native UUID generation with a deterministic local fallback for
 * non-secure/headless environments. Prefixes are only for human-readable
 * transient IDs; unit IDs remain plain UUIDs.
 */
export function createUUID(prefix?: string) {
  const value = globalThis.crypto?.randomUUID?.()
    ?? `fallback-${Date.now().toString(36)}-${(++fallbackCounter).toString(36)}`;
  return prefix ? `${prefix}_${value}` : value;
}