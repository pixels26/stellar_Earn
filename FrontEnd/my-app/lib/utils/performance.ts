import type { Metric } from 'web-vitals';
import { sloTracker } from '@/lib/slo/tracker';
import { env } from '@/lib/config/env';
import { getConsent } from '@/lib/utils/tracking';

const WEB_VITALS_ENDPOINT = `${env.apiBaseUrl()}/analytics/web-vitals`;

function sendWebVitalsMetric(metric: {
  name: string;
  value: number;
  extra?: any;
}) {
  if (typeof window === 'undefined') return;
  if (!WEB_VITALS_ENDPOINT) return;
  let payload: string;
  try {
    payload = JSON.stringify(metric);
  } catch (error) {
    console.warn('Failed to serialize web vitals metric payload', error);
    return;
  }

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.sendBeacon === 'function'
  ) {
    try {
      navigator.sendBeacon(
        WEB_VITALS_ENDPOINT,
        new Blob([payload], { type: 'application/json' })
      );
      return;
    } catch {
      // Fallback to fetch if sendBeacon is unavailable or fails.
    }
  }

  void fetch(WEB_VITALS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: payload,
    keepalive: true,
  }).catch((err) => {
    console.warn('Failed to send web vitals metric to backend analytics endpoint', err);
  });
}

export const trackPerformance = (
  metricName: string,
  value: number,
  extra?: any
) => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    console.log(`[Performance] ${metricName}: ${value}ms`, extra || '');

    // Track performance for SLO monitoring
    sloTracker.trackPerformance(metricName, value);

    const consent = getConsent();
    if (env.analyticsTestMode() || consent === 'granted') {
      sendWebVitalsMetric({ name: metricName, value, extra });
    }
  }
};

export const measureTTFB = () => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const navEntry = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;
    if (navEntry) {
      trackPerformance('TTFB', navEntry.responseStart - navEntry.requestStart);
    }
  }
};

export const measureFCP = () => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(
      (entry) => entry.name === 'first-contentful-paint'
    );
    if (fcpEntry) {
      trackPerformance('FCP', fcpEntry.startTime);
    }
  }
};

export const reportWebVitals = (onPerfEntry?: (metric: Metric) => void) => {
  if (typeof onPerfEntry !== 'function') return;

  import('web-vitals')
    .then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(onPerfEntry);
      onINP(onPerfEntry);
      onFCP(onPerfEntry);
      onLCP(onPerfEntry);
      onTTFB(onPerfEntry);
    })
    .catch((err) => {
      console.error('Error reporting web vitals:', err);
    });
};
