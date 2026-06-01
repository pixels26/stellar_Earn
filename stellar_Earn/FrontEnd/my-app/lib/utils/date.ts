/**
 * Robust date parsing and formatting utilities for StellarEarn.
 *
 * All functions accept arbitrary input and apply guardrails so callers
 * never have to handle NaN dates, null/undefined values, or thrown
 * exceptions themselves.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported named timezones used across the quest wizard. */
export const SUPPORTED_TIMEZONES = [
  'UTC',
  'America/New_York',
  'Europe/London',
  'Africa/Lagos',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Australia/Sydney',
] as const;

export type SupportedTimezone = (typeof SUPPORTED_TIMEZONES)[number];

/** Breakdown of a parsed date into its component parts. */
export interface DateParts {
  year: number;
  month: number; // 1-based
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Result returned by `parseDate`. */
export interface ParseDateResult {
  /** The parsed Date object, or null when parsing failed. */
  date: Date | null;
  /** True when the input was valid and produced a finite date. */
  isValid: boolean;
  /** Human-readable reason for failure, or null on success. */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Core parser
// ---------------------------------------------------------------------------

/**
 * Safely parse any date-like value into a `ParseDateResult`.
 *
 * Accepts:
 * - ISO 8601 strings (`"2025-06-01T12:00:00Z"`, `"2025-06-01"`)
 * - Unix timestamps as numbers (milliseconds since epoch)
 * - Existing `Date` objects (validated and returned as-is)
 * - Numeric strings (`"1748736000000"`)
 *
 * Rejects (returns `isValid: false`):
 * - `null`, `undefined`, empty strings
 * - Non-numeric strings that are not valid ISO dates
 * - Dates that produce `NaN` (e.g. `"not-a-date"`)
 * - Infinite numbers
 *
 * @example
 * parseDate('2025-06-01T00:00:00Z') // { date: Date, isValid: true, error: null }
 * parseDate('not-a-date')           // { date: null, isValid: false, error: '...' }
 * parseDate(null)                   // { date: null, isValid: false, error: '...' }
 */
export function parseDate(
  input: unknown
): ParseDateResult {
  // Guard: null / undefined
  if (input === null || input === undefined) {
    return {
      date: null,
      isValid: false,
      error: 'Date input is null or undefined.',
    };
  }

  // Guard: already a Date object
  if (input instanceof Date) {
    if (isNaN(input.getTime())) {
      return {
        date: null,
        isValid: false,
        error: 'Provided Date object is invalid (NaN).',
      };
    }
    return { date: input, isValid: true, error: null };
  }

  // Guard: number (Unix timestamp in ms)
  if (typeof input === 'number') {
    if (!isFinite(input)) {
      return {
        date: null,
        isValid: false,
        error: 'Numeric timestamp is not finite.',
      };
    }
    const date = new Date(input);
    if (isNaN(date.getTime())) {
      return {
        date: null,
        isValid: false,
        error: `Cannot create a valid date from number: ${input}.`,
      };
    }
    return { date, isValid: true, error: null };
  }

  // Guard: string
  if (typeof input === 'string') {
    const trimmed = input.trim();

    if (trimmed === '') {
      return {
        date: null,
        isValid: false,
        error: 'Date string is empty.',
      };
    }

    // Try numeric string (Unix ms timestamp)
    if (/^\d+$/.test(trimmed)) {
      const ts = Number(trimmed);
      if (isFinite(ts)) {
        const date = new Date(ts);
        if (!isNaN(date.getTime())) {
          return { date, isValid: true, error: null };
        }
      }
    }

    // Try native Date parsing (handles ISO 8601 and many locale formats)
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return { date, isValid: true, error: null };
    }

    return {
      date: null,
      isValid: false,
      error: `Cannot parse date string: "${trimmed}".`,
    };
  }

  // Guard: any other type
  return {
    date: null,
    isValid: false,
    error: `Unsupported date input type: ${typeof input}.`,
  };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the input can be parsed into a valid, finite date.
 *
 * @example
 * isValidDate('2025-06-01') // true
 * isValidDate('foo')        // false
 */
export function isValidDate(input: unknown): boolean {
  return parseDate(input).isValid;
}

/**
 * Returns `true` when the parsed date is in the past relative to `now`.
 * Returns `false` for invalid inputs.
 *
 * @param input - Any date-like value.
 * @param now   - Reference point (defaults to `Date.now()`).
 */
export function isDateInPast(input: unknown, now: number = Date.now()): boolean {
  const { date, isValid } = parseDate(input);
  return isValid && date!.getTime() < now;
}

/**
 * Returns `true` when the parsed date is in the future relative to `now`.
 * Returns `false` for invalid inputs.
 *
 * @param input - Any date-like value.
 * @param now   - Reference point (defaults to `Date.now()`).
 */
export function isDateInFuture(
  input: unknown,
  now: number = Date.now()
): boolean {
  const { date, isValid } = parseDate(input);
  return isValid && date!.getTime() > now;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Format a date as a locale-aware string.
 *
 * Returns `fallback` (default `'N/A'`) when the input is invalid.
 *
 * @example
 * formatDate('2025-06-01T12:00:00Z')
 * // → "June 1, 2025 at 12:00 PM" (locale-dependent)
 */
export function formatDate(
  input: unknown,
  options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
  locale = 'en-US',
  fallback = 'N/A'
): string {
  const { date, isValid } = parseDate(input);
  if (!isValid || !date) return fallback;

  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    // Intl can throw for unsupported locale/option combos
    return date.toLocaleString(locale);
  }
}

/**
 * Format a date as a short numeric string (e.g. `"06/01/2025, 12:00 PM"`).
 *
 * Useful for table cells and compact displays.
 * Returns `fallback` when the input is invalid.
 */
export function formatShortDate(
  input: unknown,
  fallback = 'N/A'
): string {
  return formatDate(
    input,
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    },
    'en-US',
    fallback
  );
}

/**
 * Format a date as a short timestamp for timelines
 * (e.g. `"Jun 1, 2025, 12:00 PM"`).
 *
 * Returns `fallback` when the input is invalid.
 */
export function formatTimelineDate(
  input: unknown,
  fallback = 'N/A'
): string {
  return formatDate(
    input,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
    'en-US',
    fallback
  );
}

/**
 * Format a date as a relative human-readable string
 * (e.g. `"just now"`, `"3 minutes ago"`, `"2 days ago"`).
 *
 * Falls back to a locale date string for dates older than 7 days.
 * Returns `fallback` when the input is invalid.
 *
 * @param input   - Any date-like value.
 * @param now     - Reference point in ms (defaults to `Date.now()`).
 * @param fallback - Returned when the input cannot be parsed.
 */
export function formatRelativeDate(
  input: unknown,
  now: number = Date.now(),
  fallback = 'N/A'
): string {
  const { date, isValid } = parseDate(input);
  if (!isValid || !date) return fallback;

  const diffMs = now - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 0) {
    // Future date — show absolute
    return date.toLocaleDateString('en-US');
  }
  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  if (diffSeconds < 86_400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (diffSeconds < 604_800) {
    const days = Math.floor(diffSeconds / 86_400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  return date.toLocaleDateString('en-US');
}

/**
 * Format a deadline as a human-readable countdown label.
 *
 * Returns one of:
 * - `"Expired"` — deadline has passed
 * - `"Today"`   — deadline is within the next 24 hours
 * - `"1 day left"` / `"N days left"` — future deadline beyond 24 hours
 * - `null`      — input is invalid or missing
 *
 * @param input - Any date-like value representing a deadline.
 * @param now   - Reference point in ms (defaults to `Date.now()`).
 */
export function formatDeadlineLabel(
  input: unknown,
  now: number = Date.now()
): string | null {
  if (input === null || input === undefined || input === '') return null;

  const { date, isValid } = parseDate(input);
  if (!isValid || !date) return null;

  const diffMs = date.getTime() - now;

  // Already expired
  if (diffMs <= 0) return 'Expired';

  // Within the next 24 hours → "Today"
  if (diffMs < 24 * 60 * 60 * 1000) return 'Today';

  // Full days remaining (floor so "1 day left" means at least 24h but less than 48h)
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

// ---------------------------------------------------------------------------
// Timezone-aware helpers
// ---------------------------------------------------------------------------

/**
 * Validate that a timezone string is supported by the application.
 *
 * @example
 * isSupportedTimezone('UTC')              // true
 * isSupportedTimezone('America/New_York') // true
 * isSupportedTimezone('Mars/Olympus')     // false
 */
export function isSupportedTimezone(tz: unknown): tz is SupportedTimezone {
  return (
    typeof tz === 'string' &&
    (SUPPORTED_TIMEZONES as readonly string[]).includes(tz)
  );
}

/**
 * Validate that a timezone string is a valid IANA timezone identifier
 * (broader than `isSupportedTimezone` — accepts any IANA zone).
 *
 * Returns `false` for invalid or unsupported identifiers.
 */
export function isValidTimezone(tz: unknown): boolean {
  if (typeof tz !== 'string' || tz.trim() === '') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse a local datetime string (`"YYYY-MM-DDTHH:MM"` or
 * `"YYYY-MM-DDTHH:MM:SS"`) as if it were in the given timezone and
 * return an ISO 8601 UTC string.
 *
 * Returns `null` when the input string or timezone is invalid.
 *
 * @example
 * parseZonedDateTime('2025-06-01T12:00', 'America/New_York')
 * // → "2025-06-01T16:00:00.000Z"
 */
export function parseZonedDateTime(
  value: unknown,
  timezone: unknown
): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  if (!isValidTimezone(timezone)) return null;

  const tz = timezone as string;
  const match = value
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);

  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  const parts: DateParts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second ?? '0'),
  };

  if (tz === 'UTC') {
    const date = new Date(
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second
      )
    );
    return isNaN(date.getTime()) ? null : date.toISOString();
  }

  // Iterative offset correction for named timezones
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
  } catch {
    return null;
  }

  const targetMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  let timestamp = targetMs;

  for (let i = 0; i < 3; i++) {
    const formatted = formatter.formatToParts(new Date(timestamp));
    const get = (type: string) =>
      Number(formatted.find((p) => p.type === type)?.value ?? '0');

    const currentMs = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour'),
      get('minute'),
      get('second')
    );

    const diff = targetMs - currentMs;
    if (diff === 0) break;
    timestamp += diff;
  }

  const result = new Date(timestamp);
  return isNaN(result.getTime()) ? null : result.toISOString();
}

/**
 * Format a zoned datetime string for human display.
 *
 * Converts the local datetime string to UTC first, then formats it
 * using the given timezone for display.
 *
 * Returns the raw `value` string (or `'Not set'` for empty) when
 * conversion fails.
 *
 * @example
 * formatZonedDateTime('2025-06-01T12:00', 'America/New_York')
 * // → "Jun 1, 2025, 12:00 PM" (locale-dependent)
 */
export function formatZonedDateTime(
  value: unknown,
  timezone: unknown
): string {
  if (typeof value !== 'string' || value.trim() === '') return 'Not set';

  const isoValue = parseZonedDateTime(value, timezone);
  if (!isoValue) return value;

  const tz = isValidTimezone(timezone) ? (timezone as string) : undefined;

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...(tz ? { timeZone: tz } : {}),
    }).format(new Date(isoValue));
  } catch {
    return new Date(isoValue).toLocaleString();
  }
}

// ---------------------------------------------------------------------------
// Countdown / time-remaining helpers
// ---------------------------------------------------------------------------

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Total milliseconds remaining (0 when expired). */
  total: number;
  /** True when the deadline has already passed. */
  isExpired: boolean;
}

/**
 * Calculate the time remaining until a deadline.
 *
 * Returns all-zero values with `isExpired: true` when the deadline has
 * passed or the input is invalid.
 *
 * @param input - Any date-like value representing a deadline.
 * @param now   - Reference point in ms (defaults to `Date.now()`).
 */
export function calculateTimeRemaining(
  input: unknown,
  now: number = Date.now()
): TimeRemaining {
  const expired: TimeRemaining = {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
    isExpired: true,
  };

  const { date, isValid } = parseDate(input);
  if (!isValid || !date) return expired;

  const total = date.getTime() - now;
  if (total <= 0) return expired;

  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((total % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((total % (1000 * 60)) / 1000),
    total,
    isExpired: false,
  };
}
