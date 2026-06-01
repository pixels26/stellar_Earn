/**
 * Test Flake Tracker Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { testFlakeTracker } from '../test-tracker';

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

describe('TestFlakeTracker', () => {
  beforeEach(() => {
    testFlakeTracker.clearResults();
  });

  describe('recordTestResult', () => {
    it('should record test results', () => {
      testFlakeTracker.recordTestResult({
        testName: 'test1',
        passed: true,
        retries: 0,
        duration: 100,
        file: 'test.spec.ts',
      });
      
      const flaky = testFlakeTracker.getFlakyTests();
      expect(flaky).toHaveLength(0);
    });

    it('should identify flaky tests with failures', () => {
      testFlakeTracker.recordTestResult({
        testName: 'test1',
        passed: false,
        retries: 0,
        duration: 100,
        file: 'test.spec.ts',
      });
      
      const flaky = testFlakeTracker.getFlakyTests(1);
      expect(flaky).toHaveLength(1);
    });

    it('should identify flaky tests with retries', () => {
      testFlakeTracker.recordTestResult({
        testName: 'test1',
        passed: true,
        retries: 3,
        duration: 100,
        file: 'test.spec.ts',
      });
      
      const flaky = testFlakeTracker.getFlakyTests(1);
      expect(flaky).toHaveLength(1);
    });
  });

  describe('getFlakeRateByTest', () => {
    it('should calculate flake rate for specific test', () => {
      testFlakeTracker.recordTestResult({
        testName: 'test1',
        passed: true,
        retries: 0,
        duration: 100,
        file: 'test.spec.ts',
      });
      testFlakeTracker.recordTestResult({
        testName: 'test1',
        passed: false,
        retries: 0,
        duration: 100,
        file: 'test.spec.ts',
      });
      
      const flakeRate = testFlakeTracker.getFlakeRateByTest('test1');
      expect(flakeRate).toBe(0.5);
    });

    it('should return 0 for non-existent test', () => {
      const flakeRate = testFlakeTracker.getFlakeRateByTest('nonexistent');
      expect(flakeRate).toBe(0);
    });
  });

  describe('getOverallFlakeRate', () => {
    it('should calculate overall flake rate', () => {
      testFlakeTracker.recordTestResult({
        testName: 'test1',
        passed: true,
        retries: 0,
        duration: 100,
        file: 'test.spec.ts',
      });
      testFlakeTracker.recordTestResult({
        testName: 'test2',
        passed: false,
        retries: 0,
        duration: 100,
        file: 'test.spec.ts',
      });
      testFlakeTracker.recordTestResult({
        testName: 'test3',
        passed: true,
        retries: 2,
        duration: 100,
        file: 'test.spec.ts',
      });
      
      const flakeRate = testFlakeTracker.getOverallFlakeRate();
      expect(flakeRate).toBeCloseTo(0.667, 2);
    });

    it('should return 0 when no tests recorded', () => {
      const flakeRate = testFlakeTracker.getOverallFlakeRate();
      expect(flakeRate).toBe(0);
    });
  });

  describe('clearResults', () => {
    it('should clear all test results', () => {
      testFlakeTracker.recordTestResult({
        testName: 'test1',
        passed: true,
        retries: 0,
        duration: 100,
        file: 'test.spec.ts',
      });
      
      testFlakeTracker.clearResults();
      const flakeRate = testFlakeTracker.getOverallFlakeRate();
      
      expect(flakeRate).toBe(0);
    });
  });
});
