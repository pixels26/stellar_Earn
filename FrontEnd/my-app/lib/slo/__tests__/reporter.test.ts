/**
 * SLO Reporter Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sloReporter } from '../reporter';
import { sloTracker } from '../tracker';

vi.mock('../config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config')>();
  return {
    ...actual,
    isSLOTrackingEnabled: vi.fn(() => true),
    SLO_CONFIG: {
      ...actual.SLO_CONFIG,
      performanceSampleRate: 1.0, // 100% sampling for tests
    },
  };
});

describe('SLOReporter', () => {
  beforeEach(() => {
    sloTracker.clearMetrics();
  });

  describe('generateReport', () => {
    it('should generate a complete SLO report', () => {
      sloTracker.trackError('TypeError', 10);
      sloTracker.trackPerformance('LCP', 1500);
      sloTracker.trackTestResult('test1', true, 0);
      
      const report = sloReporter.generateReport();
      
      expect(report).toHaveProperty('errorRate');
      expect(report).toHaveProperty('p95LoadTime');
      expect(report).toHaveProperty('testFlakeRate');
      expect(report).toHaveProperty('overallStatus');
      expect(report).toHaveProperty('timestamp');
    });

    it('should calculate overall status as healthy when all metrics are healthy', () => {
      sloTracker.trackError('TypeError', 1);
      sloTracker.trackPerformance('LCP', 1000);
      sloTracker.trackTestResult('test1', true, 0);
      
      const report = sloReporter.generateReport();
      
      expect(report.overallStatus).toBe('healthy');
    });

    it('should calculate overall status as warning when any metric is warning', () => {
      sloTracker.trackError('TypeError', 3); // Warning level error rate
      sloTracker.trackPerformance('LCP', 1000);
      sloTracker.trackTestResult('test1', true, 0);
      
      const report = sloReporter.generateReport();
      
      expect(report.overallStatus).toBe('warning');
    });

    it('should calculate overall status as critical when any metric is critical', () => {
      sloTracker.trackError('TypeError', 200); // Very high error rate
      sloTracker.trackPerformance('LCP', 1000);
      sloTracker.trackTestResult('test1', true, 0);
      
      const report = sloReporter.generateReport();
      
      expect(report.overallStatus).toBe('critical');
    });
  });

  describe('formatReportForDisplay', () => {
    it('should format report as readable string', () => {
      sloTracker.trackError('TypeError', 10);
      sloTracker.trackPerformance('LCP', 1500);
      sloTracker.trackTestResult('test1', true, 0);
      
      const report = sloReporter.generateReport();
      const formatted = sloReporter.formatReportForDisplay(report);
      
      expect(formatted).toContain('SLO Report');
      expect(formatted).toContain('Error Rate');
      expect(formatted).toContain('p95 Load Time');
      expect(formatted).toContain('Test Flake Rate');
    });
  });

  describe('checkAlerts', () => {
    it('should return no alerts when all metrics are healthy', () => {
      sloTracker.trackError('TypeError', 1);
      sloTracker.trackPerformance('LCP', 1000);
      sloTracker.trackTestResult('test1', true, 0);
      
      const report = sloReporter.generateReport();
      const alerts = sloReporter.checkAlerts(report);
      
      expect(alerts).toHaveLength(0);
    });

    it('should return warning alerts when metrics are at warning level', () => {
      sloTracker.trackError('TypeError', 3); // Warning level
      sloTracker.trackPerformance('LCP', 1000);
      sloTracker.trackTestResult('test1', true, 0);
      
      const report = sloReporter.generateReport();
      const alerts = sloReporter.checkAlerts(report);
      
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.includes('WARNING'))).toBe(true);
    });

    it('should return critical alerts when metrics are at critical level', () => {
      sloTracker.trackError('TypeError', 200);
      sloTracker.trackPerformance('LCP', 1000);
      sloTracker.trackTestResult('test1', true, 0);
      
      const report = sloReporter.generateReport();
      const alerts = sloReporter.checkAlerts(report);
      
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.includes('CRITICAL'))).toBe(true);
    });
  });
});
