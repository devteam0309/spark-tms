import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateInput,
  STATUS_CONFIG,
  truncate,
  QUARTERS,
  MODES,
  YEARS,
  SPARK_STATUSES,
} from '../../utils/helpers';

describe('formatDate', () => {
  it('returns em-dash for null/undefined', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
  });

  it('formats a valid ISO string', () => {
    const result = formatDate('2026-06-07T00:00:00.000Z');
    expect(result).toMatch(/Jun/);
    expect(result).toMatch(/2026/);
  });

  it('formats a Date object', () => {
    const result = formatDate(new Date('2026-01-15'));
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/2026/);
  });

  it('applies a custom format', () => {
    const result = formatDate('2026-01-15', 'yyyy/MM/dd');
    expect(result).toBe('2026/01/15');
  });

  it('returns em-dash for invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });

  it('returns "TBD" as-is', () => {
    expect(formatDate('TBD')).toBe('TBD');
  });

  it('formats a legacy Date-cast string from the assessmentDate/graduationDate Date→String migration', () => {
    // Records saved before assessmentDate/graduationDate became String fields still hold
    // real BSON Date values, which Mongoose serializes via Date.prototype.toString() on
    // read (e.g. "Mon Jun 15 2026 08:00:00 GMT+0800 (...)") rather than ISO. parseISO
    // alone returns Invalid Date for this — formatDate must fall back to `new Date`.
    const legacy = 'Mon Jun 15 2026 08:00:00 GMT+0800 (Singapore Standard Time)';
    const result = formatDate(legacy);
    expect(result).toMatch(/Jun/);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2026/);
  });
});

describe('formatDateInput', () => {
  it('returns empty string for null/undefined', () => {
    expect(formatDateInput(null)).toBe('');
    expect(formatDateInput(undefined)).toBe('');
  });

  it('returns yyyy-MM-dd format', () => {
    expect(formatDateInput('2026-03-15')).toBe('2026-03-15');
  });

  it('returns empty string for invalid date', () => {
    expect(formatDateInput('invalid')).toBe('');
  });

  it('returns "TBD" as-is', () => {
    expect(formatDateInput('TBD')).toBe('TBD');
  });

  it('formats a legacy Date-cast string to yyyy-MM-dd (same migration fallback as formatDate)', () => {
    const legacy = 'Mon Jun 15 2026 08:00:00 GMT+0800 (Singapore Standard Time)';
    expect(formatDateInput(legacy)).toBe('2026-06-15');
  });
});

describe('STATUS_CONFIG', () => {
  const expectedStatuses = [
    'draft', 'submitted', 'under_review', 'for_revision',
    'approved', 'ongoing', 'completed', 'consolidated',
  ];

  it('has an entry for every workflow status', () => {
    expectedStatuses.forEach((s) => {
      expect(STATUS_CONFIG).toHaveProperty(s);
      expect(STATUS_CONFIG[s].label).toBeTruthy();
      expect(STATUS_CONFIG[s].color).toMatch(/bg-/);
    });
  });
});

describe('truncate', () => {
  it('returns em-dash for empty/null', () => {
    expect(truncate(null)).toBe('—');
    expect(truncate('')).toBe('—');
  });

  it('returns full string when shorter than limit', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('truncates long string and appends ellipsis', () => {
    const result = truncate('A'.repeat(50), 40);
    expect(result.length).toBe(41); // 40 chars + '…'
    expect(result).toMatch(/…$/);
  });

  it('uses default limit of 40', () => {
    const result = truncate('B'.repeat(50));
    expect(result.length).toBe(41);
  });
});

describe('Constants', () => {
  it('QUARTERS has four quarters', () => {
    expect(QUARTERS).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
  });

  it('MODES has expected training modes', () => {
    expect(MODES).toContain('Face-to-Face');
    expect(MODES).toContain('Online');
    expect(MODES).toContain('Hybrid');
  });

  it('YEARS is a non-empty array of numbers', () => {
    expect(Array.isArray(YEARS)).toBe(true);
    expect(YEARS.length).toBeGreaterThan(0);
    YEARS.forEach((y) => expect(typeof y).toBe('number'));
  });

  it('SPARK_STATUSES does not include draft', () => {
    expect(SPARK_STATUSES).not.toContain('draft');
    expect(SPARK_STATUSES).toContain('submitted');
    expect(SPARK_STATUSES).toContain('consolidated');
  });
});
