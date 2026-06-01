/**
 * SLO Reporter - Generates SLO reports and evaluates compliance
 */

import { getSLOThresholds } from './config';
import { sloTracker } from './tracker';
import type { SLOMetricStatus, SLOReport } from './types';

export class SLOReporter {
  generateReport(): SLOReport {
    const thresholds = getSLOThresholds();
    const data = sloTracker.generateSLOReport();

    // Error rate status
    const errorRateStatus = sloTracker.getMetricStatus(
      data.errorRate.errorRate,
      thresholds.errorRate.target,
      thresholds.errorRate.warning,
      thresholds.errorRate.critical,
      sloTracker['errorMetrics']
    );

    // p95 load time status
    const p95Status = sloTracker.getMetricStatus(
      data.performance.p95,
      thresholds.p95LoadTime.target,
      thresholds.p95LoadTime.warning,
      thresholds.p95LoadTime.critical,
      sloTracker['performanceMetrics'].filter((m) => m.name === 'LCP')
    );

    // Test flake rate status
    const testFlakeStatus = sloTracker.getMetricStatus(
      data.testFlake.flakeRate,
      thresholds.testFlakeRate.target,
      thresholds.testFlakeRate.warning,
      thresholds.testFlakeRate.critical,
      sloTracker['testMetrics']
    );

    // Overall status
    const statuses = [
      errorRateStatus.status,
      p95Status.status,
      testFlakeStatus.status,
    ];
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (statuses.includes('critical')) overallStatus = 'critical';
    else if (statuses.includes('warning')) overallStatus = 'warning';

    return {
      errorRate: errorRateStatus,
      p95LoadTime: p95Status,
      testFlakeRate: testFlakeStatus,
      overallStatus,
      timestamp: Date.now(),
      timeWindow: 24 * 60 * 60 * 1000, // 24 hours
    };
  }

  formatReportForDisplay(report: SLOReport): string {
    const formatPercent = (val: number) => `${(val * 100).toFixed(2)}%`;
    const formatMs = (val: number) => `${val.toFixed(0)}ms`;

    return `
SLO Report - ${new Date(report.timestamp).toISOString()}
==============================================

Overall Status: ${report.overallStatus.toUpperCase()}

Error Rate:
  Current: ${formatPercent(report.errorRate.current)}
  Target: ${formatPercent(report.errorRate.target)}
  Status: ${report.errorRate.status}
  Trend: ${report.errorRate.trend}

p95 Load Time:
  Current: ${formatMs(report.p95LoadTime.current)}
  Target: ${formatMs(report.p95LoadTime.target)}
  Status: ${report.p95LoadTime.status}
  Trend: ${report.p95LoadTime.trend}

Test Flake Rate:
  Current: ${formatPercent(report.testFlakeRate.current)}
  Target: ${formatPercent(report.testFlakeRate.target)}
  Status: ${report.testFlakeRate.status}
  Trend: ${report.testFlakeRate.trend}
`;
  }

  checkAlerts(report: SLOReport): string[] {
    const alerts: string[] = [];

    if (report.errorRate.status === 'critical') {
      alerts.push(
        `CRITICAL: Error rate ${(report.errorRate.current * 100).toFixed(2)}% exceeds threshold of ${(report.errorRate.target * 100).toFixed(2)}%`
      );
    } else if (report.errorRate.status === 'warning') {
      alerts.push(
        `WARNING: Error rate ${(report.errorRate.current * 100).toFixed(2)}% approaching threshold`
      );
    }

    if (report.p95LoadTime.status === 'critical') {
      alerts.push(
        `CRITICAL: p95 load time ${report.p95LoadTime.current.toFixed(0)}ms exceeds threshold of ${report.p95LoadTime.target.toFixed(0)}ms`
      );
    } else if (report.p95LoadTime.status === 'warning') {
      alerts.push(
        `WARNING: p95 load time ${report.p95LoadTime.current.toFixed(0)}ms approaching threshold`
      );
    }

    if (report.testFlakeRate.status === 'critical') {
      alerts.push(
        `CRITICAL: Test flake rate ${(report.testFlakeRate.current * 100).toFixed(2)}% exceeds threshold of ${(report.testFlakeRate.target * 100).toFixed(2)}%`
      );
    } else if (report.testFlakeRate.status === 'warning') {
      alerts.push(
        `WARNING: Test flake rate ${(report.testFlakeRate.current * 100).toFixed(2)}% approaching threshold`
      );
    }

    return alerts;
  }
}

export const sloReporter = new SLOReporter();
