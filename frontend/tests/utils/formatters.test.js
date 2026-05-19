import { describe, it, expect } from 'vitest';
import { formatDate, formatRelative, formatBytes } from '../../src/utils/formatters';

describe('formatters', () => {
  it('formatDate returns dash for empty input', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('formatDate formats ISO string', () => {
    const result = formatDate('2024-06-15T10:30:00Z');
    expect(result).toMatch(/15/);
  });

  it('formatRelative returns Mai connesso for empty', () => {
    expect(formatRelative(null)).toBe('Mai connesso');
  });

  it('formatRelative returns Adesso for recent timestamp', () => {
    expect(formatRelative(new Date().toISOString())).toBe('Adesso');
  });

  it('formatBytes formats kilobytes', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  it('formatBytes returns 0 B for falsy', () => {
    expect(formatBytes(0)).toBe('0 B');
  });
});
