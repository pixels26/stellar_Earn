/**
 * SLO Tracker Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
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

describe('SLOTracker', () => {
  beforeEach(() => {
    sloTracker.clearMetrics();
  });

  describe('trackError', () => {
    it('should track error metrics', () => {
      sloTracker.trackError('TypeError', 5);
      const data = sloTracker.calculateErrorRate();
      
      expect(data.totalErrors).toBe(5);
      expect(data.errorsByType['TypeError']).toBe(5);
    });

    it('should accumulate errors by type', () => {
      sloTracker.trackError('TypeError', 3);
      sloTracker.trackError('ReferenceError', 2);
      const data = sloTracker.calculateErrorRate();
      
      expect(data.totalErrors).toBe(5);
      expect(data.errorsByType['TypeError']).toBe(3);
      expect(data.errorsByType['ReferenceError']).toBe(2);
    });
  });

  describe('trackPerformance', () => {
    it('should track performance metrics', () => {
      sloTracker.trackPerformance('LCP', 1500);
      sloTracker.trackPerformance('LCP', 2000);
      const data = sloTracker.calculatePerformanceMetrics('LCP');
      
      expect(data.samples).toHaveLength(2);
      expect(data.mean).toBe(1750);
    });

    it('should calculate percentiles correctly', () => {
      const values = [1000, 1500, 2000, 2500, 3000];
      values.forEach(v => sloTracker.trackPerformance('LCP', v));
      const data = sloTracker.calculatePerformanceMetrics('LCP');
      
      expect(data.p50).toBe(2000);
      expect(data.p95).toBe(3000);
    });

    it('should return zeros when no metrics exist', () => {
      const data = sloTracker.calculatePerformanceMetrics('LCP');
      
      expect(data.samples).toHaveLength(0);
      expect(data.p50).toBe(0);
      expect(data.p95).toBe(0);
    });
  });

  describe('trackTestResult', () => {
    it('should track test results', () => {
      sloTracker.trackTestResult('test1', true, 0);
      sloTracker.trackTestResult('test2', false, 1);
      const data = sloTracker.calculateTestFlakeRate();
      
      expect(data.totalTests).toBe(2);
      expect(data.flakyTests).toBe(1);
    });

    it('should track retries as flaky', () => {
      sloTracker.trackTestResult('test1', true, 2);
      const data = sloTracker.calculateTestFlakeRate();
      
      expect(data.flakyTests).toBe(1);
      expect(data.retries).toBe(2);
    });

    it('should calculate flake rate correctly', () => {
      sloTracker.trackTestResult('test1', true, 0);
      sloTracker.trackTestResult('test2', false, 0);
      sloTracker.trackTestResult('test3', true, 1);
      const data = sloTracker.calculateTestFlakeRate();
      
      expect(data.totalTests).toBe(3);
      expect(data.flakyTests).toBe(2);
      expect(data.flakeRate).toBeCloseTo(0.667, 2);
    });
  });

  describe('getMetricStatus', () => {
    it('should return healthy status when below target', () => {
      const status = sloTracker.getMetricStatus(0.005, 0.01, 0.02, 0.05, []);
      
      expect(status.status).toBe('healthy');
    });

    it('should return warning status when above target but below critical', () => {
      const status = sloTracker.getMetricStatus(0.03, 0.01, 0.02, 0.05, []);
      
      expect(status.status).toBe('warning');
    });

    it('should return critical status when above critical threshold', () => {
      const status = sloTracker.getMetricStatus(0.06, 0.01, 0.02, 0.05, []);
      
      expect(status.status).toBe('critical');
    });

    it('should calculate improving trend', () => {
      const history = Array.from({ length: 20 }, (_, i) => ({
        name: 'test',
        value: 10 - i * 0.5,
        timestamp: Date.now() - (20 - i) * 1000,
      }));
      const status = sloTracker.getMetricStatus(5, 10, 15, 20, history);
      
      expect(status.trend).toBe('improving');
    });

    it('should calculate degrading trend', () => {
      const history = Array.from({ length: 20 }, (_, i) => ({
        name: 'test',
        value: i * 0.5 + 5,
        timestamp: Date.now() - (20 - i) * 1000,
      }));
      const status = sloTracker.getMetricStatus(15, 10, 15, 20, history);
      
      expect(status.trend).toBe('degrading');
    });
  });

  describe('generateSLOReport', () => {
    it('should generate a complete SLO report', () => {
      sloTracker.trackError('TypeError', 5);
      sloTracker.trackPerformance('LCP', 1500);
      sloTracker.trackTestResult('test1', true, 0);
      
      const report = sloTracker.generateSLOReport();
      
      expect(report.errorRate.totalErrors).toBe(5);
      expect(report.performance.samples).toHaveLength(1);
      expect(report.testFlake.totalTests).toBe(1);
    });
  });
});
