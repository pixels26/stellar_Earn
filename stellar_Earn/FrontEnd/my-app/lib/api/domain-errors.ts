/**
 * Domain-specific API error message maps.
 *
 * Each domain maps HTTP status codes to user-facing messages.
 * A `default` key is used as a fallback for unmapped status codes.
 */

export type DomainErrorMap = Record<number | 'default', string>;

export const AUTH_ERRORS: DomainErrorMap = {
  400: 'Invalid credentials. Please check your input and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'Account not found. Please check your Stellar address.',
  409: 'An account with this address already exists.',
  422: 'Invalid wallet signature. Please try signing in again.',
  429: 'Too many sign-in attempts. Please wait a moment and try again.',
  500: 'Authentication service is unavailable. Please try again later.',
  default: 'Authentication failed. Please try again.',
};

export const QUESTS_ERRORS: DomainErrorMap = {
  400: 'Invalid quest data. Please review your input.',
  401: 'You must be signed in to access quests.',
  403: 'You do not have permission to manage this quest.',
  404: 'Quest not found. It may have been removed.',
  409: 'A quest with this ID already exists.',
  422: 'Quest validation failed. Please check all required fields.',
  429: 'Too many requests. Please slow down.',
  500: 'Quest service is unavailable. Please try again later.',
  default: 'Something went wrong with the quest. Please try again.',
};

export const SUBMISSIONS_ERRORS: DomainErrorMap = {
  400: 'Invalid submission. Please check your proof and try again.',
  401: 'You must be signed in to submit proof.',
  403: 'You are not allowed to submit to this quest.',
  404: 'Submission not found.',
  409: 'You have already submitted proof for this quest.',
  413: 'Your proof file is too large. Please upload a smaller file.',
  422: 'Submission validation failed. Please review your proof.',
  429: 'Too many submissions. Please wait before trying again.',
  500: 'Submission service is unavailable. Please try again later.',
  default: 'Submission failed. Please try again.',
};

export const PAYOUTS_ERRORS: DomainErrorMap = {
  400: 'Invalid payout request. Please check your details.',
  401: 'You must be signed in to claim rewards.',
  403: 'You are not eligible to claim this reward.',
  404: 'Payout not found.',
  409: 'This reward has already been claimed.',
  422: 'Payout validation failed. Ensure your Stellar address is correct.',
  429: 'Too many payout requests. Please wait before trying again.',
  500: 'Payout service is unavailable. Please try again later.',
  503: 'The Stellar network is temporarily unavailable. Please try again shortly.',
  default: 'Payout failed. Please try again.',
};

export const USERS_ERRORS: DomainErrorMap = {
  400: 'Invalid profile data. Please check your input.',
  401: 'You must be signed in to update your profile.',
  403: 'You do not have permission to modify this profile.',
  404: 'User not found.',
  409: 'This username or address is already taken.',
  422: 'Profile validation failed. Please review your details.',
  429: 'Too many requests. Please slow down.',
  500: 'User service is unavailable. Please try again later.',
  default: 'Something went wrong with your profile. Please try again.',
};

/** All supported API domains. */
export type ApiDomain =
  | 'auth'
  | 'quests'
  | 'submissions'
  | 'payouts'
  | 'users';

/** Registry mapping domain names to their error maps. */
export const DOMAIN_ERROR_MAPS: Record<ApiDomain, DomainErrorMap> = {
  auth: AUTH_ERRORS,
  quests: QUESTS_ERRORS,
  submissions: SUBMISSIONS_ERRORS,
  payouts: PAYOUTS_ERRORS,
  users: USERS_ERRORS,
};
