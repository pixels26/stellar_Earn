/**
 * SLO (Service Level Objective) Types
 */

export interface SLOMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface SLOReport {
  errorRate: SLOMetricStatus;
  p95LoadTime: SLOMetricStatus;
  testFlakeRate: SLOMetricStatus;
  overallStatus: 'healthy' | 'warning' | 'critical';
  timestamp: number;
  timeWindow: number;
}

export interface SLOMetricStatus {
  current: number;
  target: number;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'improving' | 'degrading' | 'stable';
  history: SLOMetric[];
}

export interface ErrorRateData {
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  errorsByType: Record<string, number>;
}

export interface PerformanceData {
  samples: number[];
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  mean: number;
}

export interface TestFlakeData {
  totalTests: number;
  flakyTests: number;
  flakeRate: number;
  flakyTestsByName: Record<string, number>;
  retries: number;
}
