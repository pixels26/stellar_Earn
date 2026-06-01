/**
 * Unit tests for lib/utils/date.ts
 *
 * Covers: parseDate, isValidDate, isDateInPast, isDateInFuture,
 *         formatDate, formatShortDate, formatTimelineDate,
 *         formatRelativeDate, formatDeadlineLabel,
 *         isSupportedTimezone, isValidTimezone,
 *         parseZonedDateTime, formatZonedDateTime,
 *         calculateTimeRemaining
 */

import { describe, test, expect } from 'vitest';
import {
  parseDate,
  isValidDate,
  isDateInPast,
  isDateInFuture,
  formatDate,
  formatShortDate,
  formatTimelineDate,
  formatRelativeDate,
  formatDeadlineLabel,
  isSupportedTimezone,
  isValidTimezone,
  parseZonedDateTime,
  formatZonedDateTime,
  calculateTimeRemaining,
  SUPPORTED_TIMEZONES,
} from '../date';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A fixed reference timestamp: 2025-06-01T12:00:00.000Z */
const REF_MS = new Date('2025-06-01T12:00:00.000Z').getTime();

// ---------------------------------------------------------------------------
// parseDate
// ---------------------------------------------------------------------------

describe('parseDate', () => {
  // --- Valid inputs ---
  test('parses a valid ISO 8601 string with time and Z suffix', () => {
    const result = parseDate('2025-06-01T12:00:00.000Z');
    expect(result.isValid).toBe(true);
    expect(result.date).toBeInstanceOf(Date);
    expect(result.error).toBeNull();
  });

  test('parses a valid ISO date-only string', () => {
    const result = parseDate('2025-06-01');
    expect(result.isValid).toBe(true);
    expect(result.date).toBeInstanceOf(Date);
  });

  test('parses a valid ISO string without Z (local time)', () => {
    const result = parseDate('2025-06-01T12:00:00');
    expect(result.isValid).toBe(true);
    expect(result.date).toBeInstanceOf(Date);
  });

  test('parses a numeric Unix timestamp (number)', () => {
    const result = parseDate(REF_MS);
    expect(result.isValid).toBe(true);
    expect(result.date!.getTime()).toBe(REF_MS);
  });

  test('parses a numeric string timestamp', () => {
    const result = parseDate(String(REF_MS));
    expect(result.isValid).toBe(true);
    expect(result.date!.getTime()).toBe(REF_MS);
  });

  test('parses a valid Date object', () => {
    const d = new Date('2025-06-01T12:00:00Z');
    const result = parseDate(d);
    expect(result.isValid).toBe(true);
    expect(result.date).toBe(d);
  });

  test('parses zero timestamp (epoch)', () => {
    const result = parseDate(0);
    expect(result.isValid).toBe(true);
    expect(result.date!.getTime()).toBe(0);
  });

  // --- Invalid inputs ---
  test('rejects null', () => {
    const result = parseDate(null);
    expect(result.isValid).toBe(false);
    expect(result.date).toBeNull();
    expect(result.error).toMatch(/null or undefined/i);
  });

  test('rejects undefined', () => {
    const result = parseDate(undefined);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/null or undefined/i);
  });

  test('rejects empty string', () => {
    const result = parseDate('');
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/empty/i);
  });

  test('rejects whitespace-only string', () => {
    const result = parseDate('   ');
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/empty/i);
  });

  test('rejects a non-date string', () => {
    const result = parseDate('not-a-date');
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/cannot parse/i);
  });

  test('rejects a random word string', () => {
    const result = parseDate('hello world');
    expect(result.isValid).toBe(false);
  });

  test('rejects an invalid Date object (NaN)', () => {
    const result = parseDate(new Date('invalid'));
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/invalid.*NaN/i);
  });

  test('rejects Infinity', () => {
    const result = parseDate(Infinity);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/not finite/i);
  });

  test('rejects -Infinity', () => {
    const result = parseDate(-Infinity);
    expect(result.isValid).toBe(false);
  });

  test('rejects NaN number', () => {
    const result = parseDate(NaN);
    expect(result.isValid).toBe(false);
  });

  test('rejects boolean true', () => {
    const result = parseDate(true);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/unsupported.*type/i);
  });

  test('rejects plain object', () => {
    const result = parseDate({});
    expect(result.isValid).toBe(false);
  });

  test('rejects array', () => {
    const result = parseDate([]);
    expect(result.isValid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidDate
// ---------------------------------------------------------------------------

describe('isValidDate', () => {
  test('returns true for a valid ISO string', () => {
    expect(isValidDate('2025-06-01T00:00:00Z')).toBe(true);
  });

  test('returns false for null', () => {
    expect(isValidDate(null)).toBe(false);
  });

  test('returns false for an invalid string', () => {
    expect(isValidDate('garbage')).toBe(false);
  });

  test('returns true for a valid Date object', () => {
    expect(isValidDate(new Date())).toBe(true);
  });

  test('returns false for an invalid Date object', () => {
    expect(isValidDate(new Date('bad'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isDateInPast / isDateInFuture
// ---------------------------------------------------------------------------

describe('isDateInPast', () => {
  test('returns true for a date before now', () => {
    const past = new Date(REF_MS - 1000).toISOString();
    expect(isDateInPast(past, REF_MS)).toBe(true);
  });

  test('returns false for a date after now', () => {
    const future = new Date(REF_MS + 1000).toISOString();
    expect(isDateInPast(future, REF_MS)).toBe(false);
  });

  test('returns false for an invalid input', () => {
    expect(isDateInPast(null, REF_MS)).toBe(false);
  });

  test('returns false for a date equal to now (not strictly past)', () => {
    expect(isDateInPast(REF_MS, REF_MS)).toBe(false);
  });
});

describe('isDateInFuture', () => {
  test('returns true for a date after now', () => {
    const future = new Date(REF_MS + 1000).toISOString();
    expect(isDateInFuture(future, REF_MS)).toBe(true);
  });

  test('returns false for a date before now', () => {
    const past = new Date(REF_MS - 1000).toISOString();
    expect(isDateInFuture(past, REF_MS)).toBe(false);
  });

  test('returns false for an invalid input', () => {
    expect(isDateInFuture(undefined, REF_MS)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe('formatDate', () => {
  test('formats a valid ISO string with default options', () => {
    const result = formatDate('2025-06-01T12:00:00.000Z');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('N/A');
    // Should contain the year
    expect(result).toMatch(/2025/);
  });

  test('returns fallback for null', () => {
    expect(formatDate(null)).toBe('N/A');
  });

  test('returns fallback for empty string', () => {
    expect(formatDate('')).toBe('N/A');
  });

  test('returns custom fallback when provided', () => {
    expect(formatDate(null, {}, 'en-US', 'Unknown')).toBe('Unknown');
  });

  test('returns fallback for invalid string', () => {
    expect(formatDate('not-a-date')).toBe('N/A');
  });

  test('accepts a Date object', () => {
    const d = new Date('2025-06-01T12:00:00Z');
    const result = formatDate(d);
    expect(result).toMatch(/2025/);
  });
});

// ---------------------------------------------------------------------------
// formatShortDate
// ---------------------------------------------------------------------------

describe('formatShortDate', () => {
  test('returns a numeric date string for a valid input', () => {
    const result = formatShortDate('2025-06-01T12:00:00.000Z');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('N/A');
  });

  test('returns fallback for invalid input', () => {
    expect(formatShortDate('bad-date')).toBe('N/A');
  });

  test('returns custom fallback', () => {
    expect(formatShortDate(null, '—')).toBe('—');
  });
});

// ---------------------------------------------------------------------------
// formatTimelineDate
// ---------------------------------------------------------------------------

describe('formatTimelineDate', () => {
  test('returns a short month/day/year string for a valid input', () => {
    const result = formatTimelineDate('2025-06-01T12:00:00.000Z');
    expect(result).toMatch(/2025/);
    expect(result).not.toBe('N/A');
  });

  test('returns fallback for null', () => {
    expect(formatTimelineDate(null)).toBe('N/A');
  });
});

// ---------------------------------------------------------------------------
// formatRelativeDate
// ---------------------------------------------------------------------------

describe('formatRelativeDate', () => {
  test('returns "just now" for a date 30 seconds ago', () => {
    const input = new Date(REF_MS - 30_000).toISOString();
    expect(formatRelativeDate(input, REF_MS)).toBe('just now');
  });

  test('returns "1 minute ago" for a date 90 seconds ago', () => {
    const input = new Date(REF_MS - 90_000).toISOString();
    expect(formatRelativeDate(input, REF_MS)).toBe('1 minute ago');
  });

  test('returns "3 minutes ago" for a date 3 minutes ago', () => {
    const input = new Date(REF_MS - 3 * 60_000).toISOString();
    expect(formatRelativeDate(input, REF_MS)).toBe('3 minutes ago');
  });

  test('returns "1 hour ago" for a date 1 hour ago', () => {
    const input = new Date(REF_MS - 3600_000).toISOString();
    expect(formatRelativeDate(input, REF_MS)).toBe('1 hour ago');
  });

  test('returns "5 hours ago" for a date 5 hours ago', () => {
    const input = new Date(REF_MS - 5 * 3600_000).toISOString();
    expect(formatRelativeDate(input, REF_MS)).toBe('5 hours ago');
  });

  test('returns "1 day ago" for a date 1 day ago', () => {
    const input = new Date(REF_MS - 86_400_000).toISOString();
    expect(formatRelativeDate(input, REF_MS)).toBe('1 day ago');
  });

  test('returns "3 days ago" for a date 3 days ago', () => {
    const input = new Date(REF_MS - 3 * 86_400_000).toISOString();
    expect(formatRelativeDate(input, REF_MS)).toBe('3 days ago');
  });

  test('returns a locale date string for a date older than 7 days', () => {
    const input = new Date(REF_MS - 10 * 86_400_000).toISOString();
    const result = formatRelativeDate(input, REF_MS);
    // Should be a locale date string, not a relative label
    expect(result).not.toMatch(/ago/);
    expect(result).not.toBe('N/A');
  });

  test('returns fallback for null', () => {
    expect(formatRelativeDate(null, REF_MS)).toBe('N/A');
  });

  test('returns fallback for invalid string', () => {
    expect(formatRelativeDate('bad', REF_MS)).toBe('N/A');
  });

  test('returns a locale date string for a future date', () => {
    const input = new Date(REF_MS + 86_400_000).toISOString();
    const result = formatRelativeDate(input, REF_MS);
    expect(result).not.toMatch(/ago/);
    expect(result).not.toBe('N/A');
  });
});

// ---------------------------------------------------------------------------
// formatDeadlineLabel
// ---------------------------------------------------------------------------

describe('formatDeadlineLabel', () => {
  test('returns "Expired" for a past date', () => {
    const past = new Date(REF_MS - 86_400_000).toISOString();
    expect(formatDeadlineLabel(past, REF_MS)).toBe('Expired');
  });

  test('returns "Expired" for a deadline 1 second in the past', () => {
    const justPast = new Date(REF_MS - 1000).toISOString();
    expect(formatDeadlineLabel(justPast, REF_MS)).toBe('Expired');
  });

  test('returns "Expired" for a deadline exactly at now', () => {
    const exactNow = new Date(REF_MS).toISOString();
    expect(formatDeadlineLabel(exactNow, REF_MS)).toBe('Expired');
  });

  test('returns "Today" for a deadline 1 hour from now (within 24h)', () => {
    const oneHourAhead = new Date(REF_MS + 3_600_000).toISOString();
    expect(formatDeadlineLabel(oneHourAhead, REF_MS)).toBe('Today');
  });

  test('returns "Today" for a deadline 23 hours from now', () => {
    const almostOneDay = new Date(REF_MS + 23 * 3_600_000).toISOString();
    expect(formatDeadlineLabel(almostOneDay, REF_MS)).toBe('Today');
  });

  test('returns "1 day left" for a deadline exactly 24 hours away', () => {
    const oneDayAhead = new Date(REF_MS + 86_400_000).toISOString();
    expect(formatDeadlineLabel(oneDayAhead, REF_MS)).toBe('1 day left');
  });

  test('returns "1 day left" for a deadline 36 hours away', () => {
    const thirtysSixHours = new Date(REF_MS + 36 * 3_600_000).toISOString();
    expect(formatDeadlineLabel(thirtysSixHours, REF_MS)).toBe('1 day left');
  });

  test('returns "5 days left" for a deadline 5 days away', () => {
    const fiveDays = new Date(REF_MS + 5 * 86_400_000).toISOString();
    expect(formatDeadlineLabel(fiveDays, REF_MS)).toBe('5 days left');
  });

  test('returns null for null input', () => {
    expect(formatDeadlineLabel(null, REF_MS)).toBeNull();
  });

  test('returns null for undefined input', () => {
    expect(formatDeadlineLabel(undefined, REF_MS)).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(formatDeadlineLabel('', REF_MS)).toBeNull();
  });

  test('returns null for an invalid date string', () => {
    expect(formatDeadlineLabel('not-a-date', REF_MS)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isSupportedTimezone
// ---------------------------------------------------------------------------

describe('isSupportedTimezone', () => {
  test.each(SUPPORTED_TIMEZONES)('returns true for supported timezone: %s', (tz) => {
    expect(isSupportedTimezone(tz)).toBe(true);
  });

  test('returns false for an unsupported IANA timezone', () => {
    expect(isSupportedTimezone('America/Chicago')).toBe(false);
  });

  test('returns false for a nonsense string', () => {
    expect(isSupportedTimezone('Mars/Olympus')).toBe(false);
  });

  test('returns false for null', () => {
    expect(isSupportedTimezone(null)).toBe(false);
  });

  test('returns false for a number', () => {
    expect(isSupportedTimezone(5)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidTimezone
// ---------------------------------------------------------------------------

describe('isValidTimezone', () => {
  test('returns true for UTC', () => {
    expect(isValidTimezone('UTC')).toBe(true);
  });

  test('returns true for a valid IANA timezone not in SUPPORTED_TIMEZONES', () => {
    expect(isValidTimezone('America/Chicago')).toBe(true);
  });

  test('returns false for an invalid timezone string', () => {
    expect(isValidTimezone('Not/ATimezone')).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(isValidTimezone('')).toBe(false);
  });

  test('returns false for null', () => {
    expect(isValidTimezone(null)).toBe(false);
  });

  test('returns false for a number', () => {
    expect(isValidTimezone(42)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseZonedDateTime
// ---------------------------------------------------------------------------

describe('parseZonedDateTime', () => {
  test('converts a UTC datetime string to ISO', () => {
    const result = parseZonedDateTime('2025-06-01T12:00', 'UTC');
    expect(result).toBe('2025-06-01T12:00:00.000Z');
  });

  test('converts a UTC datetime string with seconds to ISO', () => {
    const result = parseZonedDateTime('2025-06-01T12:00:30', 'UTC');
    expect(result).toBe('2025-06-01T12:00:30.000Z');
  });

  test('converts a New York datetime to UTC ISO', () => {
    // America/New_York is UTC-4 in summer (EDT)
    const result = parseZonedDateTime('2025-06-01T12:00', 'America/New_York');
    expect(result).not.toBeNull();
    // The result should be a valid ISO string
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    // 12:00 EDT = 16:00 UTC
    expect(result).toBe('2025-06-01T16:00:00.000Z');
  });

  test('returns null for an invalid datetime format', () => {
    expect(parseZonedDateTime('01/06/2025 12:00', 'UTC')).toBeNull();
  });

  test('returns null for an empty string', () => {
    expect(parseZonedDateTime('', 'UTC')).toBeNull();
  });

  test('returns null for null value', () => {
    expect(parseZonedDateTime(null, 'UTC')).toBeNull();
  });

  test('returns null for an invalid timezone', () => {
    expect(parseZonedDateTime('2025-06-01T12:00', 'Not/Valid')).toBeNull();
  });

  test('returns null for null timezone', () => {
    expect(parseZonedDateTime('2025-06-01T12:00', null)).toBeNull();
  });

  test('returns null for empty timezone', () => {
    expect(parseZonedDateTime('2025-06-01T12:00', '')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// formatZonedDateTime
// ---------------------------------------------------------------------------

describe('formatZonedDateTime', () => {
  test('returns "Not set" for empty string', () => {
    expect(formatZonedDateTime('', 'UTC')).toBe('Not set');
  });

  test('returns "Not set" for null', () => {
    expect(formatZonedDateTime(null, 'UTC')).toBe('Not set');
  });

  test('returns a formatted string for a valid UTC datetime', () => {
    const result = formatZonedDateTime('2025-06-01T12:00', 'UTC');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('Not set');
    expect(result).toMatch(/2025/);
  });

  test('returns the raw value when timezone is invalid', () => {
    const value = '2025-06-01T12:00';
    const result = formatZonedDateTime(value, 'Bad/Zone');
    expect(result).toBe(value);
  });

  test('returns a formatted string for America/New_York', () => {
    const result = formatZonedDateTime('2025-06-01T12:00', 'America/New_York');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('Not set');
  });
});

// ---------------------------------------------------------------------------
// calculateTimeRemaining
// ---------------------------------------------------------------------------

describe('calculateTimeRemaining', () => {
  test('returns correct breakdown for a future deadline', () => {
    // 2 days, 3 hours, 4 minutes, 5 seconds from REF_MS
    const ms =
      2 * 86_400_000 + 3 * 3_600_000 + 4 * 60_000 + 5 * 1_000;
    const deadline = new Date(REF_MS + ms).toISOString();
    const result = calculateTimeRemaining(deadline, REF_MS);

    expect(result.isExpired).toBe(false);
    expect(result.days).toBe(2);
    expect(result.hours).toBe(3);
    expect(result.minutes).toBe(4);
    expect(result.seconds).toBe(5);
    expect(result.total).toBe(ms);
  });

  test('returns expired state for a past deadline', () => {
    const past = new Date(REF_MS - 1000).toISOString();
    const result = calculateTimeRemaining(past, REF_MS);

    expect(result.isExpired).toBe(true);
    expect(result.total).toBe(0);
    expect(result.days).toBe(0);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBe(0);
  });

  test('returns expired state for null input', () => {
    const result = calculateTimeRemaining(null, REF_MS);
    expect(result.isExpired).toBe(true);
    expect(result.total).toBe(0);
  });

  test('returns expired state for an invalid string', () => {
    const result = calculateTimeRemaining('not-a-date', REF_MS);
    expect(result.isExpired).toBe(true);
  });

  test('returns expired state for undefined', () => {
    const result = calculateTimeRemaining(undefined, REF_MS);
    expect(result.isExpired).toBe(true);
  });

  test('returns expired state for a deadline exactly at now', () => {
    const result = calculateTimeRemaining(REF_MS, REF_MS);
    expect(result.isExpired).toBe(true);
  });

  test('handles a numeric timestamp as input', () => {
    const future = REF_MS + 60_000; // 1 minute ahead
    const result = calculateTimeRemaining(future, REF_MS);
    expect(result.isExpired).toBe(false);
    expect(result.minutes).toBe(1);
    expect(result.seconds).toBe(0);
  });

  test('handles a Date object as input', () => {
    const future = new Date(REF_MS + 3600_000); // 1 hour ahead
    const result = calculateTimeRemaining(future, REF_MS);
    expect(result.isExpired).toBe(false);
    expect(result.hours).toBe(1);
  });
});
