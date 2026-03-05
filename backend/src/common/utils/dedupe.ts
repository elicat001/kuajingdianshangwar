import { createHash } from 'crypto';

/**
 * Generate a deterministic dedupe key from a set of fields.
 * Used for idempotent alert creation.
 */
export function generateDedupeKey(...parts: (string | number | Date)[]): string {
  const raw = parts.map((p) => (p instanceof Date ? p.toISOString() : String(p))).join('|');
  return createHash('sha256').update(raw).digest('hex');
}
