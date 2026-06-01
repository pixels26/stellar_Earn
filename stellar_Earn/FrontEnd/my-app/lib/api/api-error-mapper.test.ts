import { describe, it, expect } from 'vitest';
import { mapApiError, inferDomainFromUrl } from './api-error-mapper';
import {
  AUTH_ERRORS,
  QUESTS_ERRORS,
  SUBMISSIONS_ERRORS,
  PAYOUTS_ERRORS,
  USERS_ERRORS,
} from './domain-errors';

// ---------------------------------------------------------------------------
// mapApiError
// ---------------------------------------------------------------------------

describe('mapApiError', () => {
  describe('with no domain (generic fallback)', () => {
    it('returns a message for a known status code', () => {
      expect(mapApiError(400)).toBe('Invalid request. Please check your input.');
      expect(mapApiError(401)).toBe('You must be signed in to continue.');
      expect(mapApiError(403)).toBe(
        'You do not have permission to perform this action.'
      );
      expect(mapApiError(404)).toBe(
        'The requested resource was not found.'
      );
      expect(mapApiError(429)).toBe('Too many requests. Please slow down.');
      expect(mapApiError(500)).toBe(
        'Something went wrong on our end. Please try again later.'
      );
    });

    it('returns the generic default for an unmapped status code', () => {
      expect(mapApiError(418)).toBe(
        'An unexpected error occurred. Please try again.'
      );
      expect(mapApiError(0)).toBe(
        'An unexpected error occurred. Please try again.'
      );
    });
  });

  describe('auth domain', () => {
    it('returns domain-specific messages for known status codes', () => {
      expect(mapApiError(401, 'auth')).toBe(AUTH_ERRORS[401]);
      expect(mapApiError(403, 'auth')).toBe(AUTH_ERRORS[403]);
      expect(mapApiError(404, 'auth')).toBe(AUTH_ERRORS[404]);
      expect(mapApiError(422, 'auth')).toBe(AUTH_ERRORS[422]);
    });

    it('returns the domain default for an unmapped status code', () => {
      expect(mapApiError(418, 'auth')).toBe(AUTH_ERRORS.default);
    });
  });

  describe('quests domain', () => {
    it('returns domain-specific messages for known status codes', () => {
      expect(mapApiError(400, 'quests')).toBe(QUESTS_ERRORS[400]);
      expect(mapApiError(404, 'quests')).toBe(QUESTS_ERRORS[404]);
      expect(mapApiError(409, 'quests')).toBe(QUESTS_ERRORS[409]);
    });

    it('returns the domain default for an unmapped status code', () => {
      expect(mapApiError(418, 'quests')).toBe(QUESTS_ERRORS.default);
    });
  });

  describe('submissions domain', () => {
    it('returns domain-specific messages for known status codes', () => {
      expect(mapApiError(409, 'submissions')).toBe(SUBMISSIONS_ERRORS[409]);
      expect(mapApiError(413, 'submissions')).toBe(SUBMISSIONS_ERRORS[413]);
    });

    it('returns the domain default for an unmapped status code', () => {
      expect(mapApiError(418, 'submissions')).toBe(SUBMISSIONS_ERRORS.default);
    });
  });

  describe('payouts domain', () => {
    it('returns domain-specific messages for known status codes', () => {
      expect(mapApiError(409, 'payouts')).toBe(PAYOUTS_ERRORS[409]);
      expect(mapApiError(503, 'payouts')).toBe(PAYOUTS_ERRORS[503]);
    });

    it('returns the domain default for an unmapped status code', () => {
      expect(mapApiError(418, 'payouts')).toBe(PAYOUTS_ERRORS.default);
    });
  });

  describe('users domain', () => {
    it('returns domain-specific messages for known status codes', () => {
      expect(mapApiError(404, 'users')).toBe(USERS_ERRORS[404]);
      expect(mapApiError(409, 'users')).toBe(USERS_ERRORS[409]);
    });

    it('returns the domain default for an unmapped status code', () => {
      expect(mapApiError(418, 'users')).toBe(USERS_ERRORS.default);
    });
  });

  describe('unknown domain string', () => {
    it('falls back to generic messages', () => {
      expect(mapApiError(404, 'unknown-domain')).toBe(
        'The requested resource was not found.'
      );
      expect(mapApiError(418, 'unknown-domain')).toBe(
        'An unexpected error occurred. Please try again.'
      );
    });
  });
});

// ---------------------------------------------------------------------------
// inferDomainFromUrl
// ---------------------------------------------------------------------------

describe('inferDomainFromUrl', () => {
  it('infers auth domain', () => {
    expect(inferDomainFromUrl('/api/v1/auth/login')).toBe('auth');
    expect(inferDomainFromUrl('/api/v1/auth/challenge')).toBe('auth');
  });

  it('infers quests domain', () => {
    expect(inferDomainFromUrl('/api/v1/quests')).toBe('quests');
    expect(inferDomainFromUrl('/api/v1/quests/123')).toBe('quests');
  });

  it('infers submissions domain', () => {
    expect(inferDomainFromUrl('/api/v1/submissions')).toBe('submissions');
    expect(inferDomainFromUrl('/api/v1/submissions/456')).toBe('submissions');
  });

  it('infers payouts domain', () => {
    expect(inferDomainFromUrl('/api/v1/payouts/claim')).toBe('payouts');
    expect(inferDomainFromUrl('/api/v1/payouts/history')).toBe('payouts');
  });

  it('infers users domain', () => {
    expect(inferDomainFromUrl('/api/v1/users/GABC')).toBe('users');
    expect(inferDomainFromUrl('/api/v1/users/search')).toBe('users');
  });

  it('returns undefined for unknown paths', () => {
    expect(inferDomainFromUrl('/api/v1/unknown')).toBeUndefined();
    expect(inferDomainFromUrl('')).toBeUndefined();
    expect(inferDomainFromUrl('/health')).toBeUndefined();
  });

  it('handles paths without api/version prefix', () => {
    expect(inferDomainFromUrl('/quests/123')).toBe('quests');
    expect(inferDomainFromUrl('/auth/login')).toBe('auth');
  });
});
