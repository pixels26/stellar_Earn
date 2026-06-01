/**
 * Centralized API error mapper.
 *
 * Maps an HTTP status code + API domain to a user-facing message.
 * Falls back gracefully when the domain or status code is unknown.
 *
 * Usage:
 *   import { mapApiError } from '@/lib/api/api-error-mapper';
 *
 *   const message = mapApiError(404, 'quests');
 *   // → "Quest not found. It may have been removed."
 */

import {
  DOMAIN_ERROR_MAPS,
  type ApiDomain,
  type DomainErrorMap,
} from './domain-errors';

/** Generic fallback messages used when no domain map is available. */
const GENERIC_ERROR_MESSAGES: DomainErrorMap = {
  400: 'Invalid request. Please check your input.',
  401: 'You must be signed in to continue.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'A conflict occurred. The resource may already exist.',
  413: 'The request payload is too large.',
  422: 'Validation failed. Please review your input.',
  429: 'Too many requests. Please slow down.',
  500: 'Something went wrong on our end. Please try again later.',
  502: 'Service temporarily unavailable. Please try again.',
  503: 'Service is down for maintenance. Please try again shortly.',
  default: 'An unexpected error occurred. Please try again.',
};

/**
 * Returns a user-facing error message for the given HTTP status code and
 * optional API domain.
 *
 * Resolution order:
 *  1. Domain-specific message for the exact status code
 *  2. Domain-specific default message
 *  3. Generic message for the exact status code
 *  4. Generic default message
 */
export function mapApiError(
  statusCode: number,
  domain?: ApiDomain | string
): string {
  const domainMap =
    domain && domain in DOMAIN_ERROR_MAPS
      ? DOMAIN_ERROR_MAPS[domain as ApiDomain]
      : null;

  if (domainMap) {
    if (statusCode in domainMap) {
      return domainMap[statusCode];
    }
    return domainMap.default;
  }

  if (statusCode in GENERIC_ERROR_MESSAGES) {
    return GENERIC_ERROR_MESSAGES[statusCode];
  }

  return GENERIC_ERROR_MESSAGES.default;
}

/**
 * Infer the API domain from a URL path segment.
 *
 * Examples:
 *   inferDomainFromUrl('/api/v1/auth/login')      → 'auth'
 *   inferDomainFromUrl('/api/v1/quests/123')      → 'quests'
 *   inferDomainFromUrl('/api/v1/submissions/456') → 'submissions'
 */
export function inferDomainFromUrl(url: string): ApiDomain | undefined {
  const segments = url.split('/').filter(Boolean);
  // Strip leading 'api' and version segments (e.g. 'v1')
  const domainSegments = segments.filter(
    (s) => s !== 'api' && !/^v\d+$/.test(s)
  );
  const first = domainSegments[0] as ApiDomain | undefined;
  return first && first in DOMAIN_ERROR_MAPS ? first : undefined;
}

export type { ApiDomain };
