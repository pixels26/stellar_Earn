import * as Sentry from '@sentry/nextjs';
import { sloTracker } from './slo/tracker';

export function initSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: false,
    beforeSend(event, hint) {
      // Track error for SLO monitoring
      if (event.exception) {
        const errorType = event.exception.values?.[0]?.type || 'unknown';
        sloTracker.trackError(errorType);
      }
      return event;
    },
  });
}

export { Sentry };
