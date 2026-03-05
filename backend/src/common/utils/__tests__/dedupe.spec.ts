import { generateDedupeKey } from '../dedupe';

describe('generateDedupeKey', () => {
  it('should produce same hash for same inputs', () => {
    const key1 = generateDedupeKey('STOCKOUT', 'sku-1', 'store-1', '2024-01-01');
    const key2 = generateDedupeKey('STOCKOUT', 'sku-1', 'store-1', '2024-01-01');

    expect(key1).toBe(key2);
  });

  it('should produce different hash for different inputs', () => {
    const key1 = generateDedupeKey('STOCKOUT', 'sku-1', 'store-1');
    const key2 = generateDedupeKey('STOCKOUT', 'sku-2', 'store-1');

    expect(key1).not.toBe(key2);
  });

  it('should handle Date objects', () => {
    const date = new Date('2024-06-15T10:00:00.000Z');
    const key1 = generateDedupeKey('type', 'sku', date);
    const key2 = generateDedupeKey('type', 'sku', date);

    expect(key1).toBe(key2);
  });

  it('should handle numeric parts', () => {
    const key1 = generateDedupeKey('type', 42, 99);
    const key2 = generateDedupeKey('type', 42, 99);

    expect(key1).toBe(key2);
  });

  it('should produce different keys when order changes', () => {
    const key1 = generateDedupeKey('a', 'b', 'c');
    const key2 = generateDedupeKey('b', 'a', 'c');

    expect(key1).not.toBe(key2);
  });

  it('should return a hex string of 64 characters (sha256)', () => {
    const key = generateDedupeKey('test');

    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });
});
