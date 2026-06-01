/**
 * SLO (Service Level Objective) Configuration
 * Defines thresholds and targets for frontend performance and reliability
 */

export interface SLOThresholds {
  errorRate: {
    target: number; // Target error rate (e.g., 0.01 for 1%)
    warning: number; // Warning threshold
    critical: number; // Critical threshold
  };
  p95LoadTime: {
    target: number; // Target p95 load time in ms
    warning: number; // Warning threshold in ms
    critical: number; // Critical threshold in ms
  };
  testFlakeRate: {
    target: number; // Target flake rate (e.g., 0.05 for 5%)
    warning: number; // Warning threshold
    critical: number; // Critical threshold
  };
}

export const DEFAULT_SLO_THRESHOLDS: SLOThresholds = {
  errorRate: {
    target: 0.01, // 1% error rate target
    warning: 0.02, // 2% warning
    critical: 0.05, // 5% critical
  },
  p95LoadTime: {
    target: 2000, // 2s target
    warning: 3000, // 3s warning
    critical: 5000, // 5s critical
  },
  testFlakeRate: {
    target: 0.02, // 2% flake rate target
    warning: 0.05, // 5% warning
    critical: 0.10, // 10% critical
  },
};

export const SLO_CONFIG = {
  // Time window for SLO calculations (in milliseconds)
  timeWindow: 24 * 60 * 60 * 1000, // 24 hours

  // Sampling rate for performance metrics
  performanceSampleRate: 0.1, // 10% sampling in production

  // Enable/disable SLO tracking by environment
  enabled: {
    production: true,
    staging: true,
    development: true, // Enabled for testing
  },

  // Alerting configuration
  alerting: {
    enabled: true,
    channels: ['sentry', 'console'],
  },

  thresholds: DEFAULT_SLO_THRESHOLDS,
};

export function getSLOThresholds(): SLOThresholds {
  return SLO_CONFIG.thresholds;
}

export function isSLOTrackingEnabled(): boolean {
  const env = process.env.NODE_ENV || 'development';
  return SLO_CONFIG.enabled[env as keyof typeof SLO_CONFIG.enabled] || false;
}
