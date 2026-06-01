/**
 * Test Flake Rate Tracker
 * Integrates with Vitest and Playwright to track test flake rates
 */

import { sloTracker } from './tracker';

export interface TestResult {
  testName: string;
  passed: boolean;
  retries: number;
  duration: number;
  file: string;
}

export class TestFlakeTracker {
  private testResults: Map<string, TestResult[]> = new Map();

  recordTestResult(result: TestResult): void {
    const key = `${result.file}:${result.testName}`;
    const existing = this.testResults.get(key) || [];
    existing.push(result);
    this.testResults.set(key, existing);

    // Track for SLO
    sloTracker.trackTestResult(result.testName, result.passed, result.retries);
  }

  getFlakyTests(threshold: number = 3): TestResult[] {
    const flaky: TestResult[] = [];

    for (const [key, results] of this.testResults.entries()) {
      const failures = results.filter((r) => !r.passed).length;
      const totalRetries = results.reduce((sum, r) => sum + r.retries, 0);

      // Consider a test flaky if it failed multiple times or had many retries
      if (failures >= threshold || totalRetries >= threshold) {
        flaky.push(...results);
      }
    }

    return flaky;
  }

  getFlakeRateByTest(testName: string): number {
    const results: TestResult[] = [];
    for (const [key, testResults] of this.testResults.entries()) {
      if (key.includes(testName)) {
        results.push(...testResults);
      }
    }

    if (results.length === 0) return 0;

    const flakyCount = results.filter(
      (r) => !r.passed || r.retries > 0
    ).length;
    return flakyCount / results.length;
  }

  getOverallFlakeRate(): number {
    let total = 0;
    let flaky = 0;

    for (const results of this.testResults.values()) {
      for (const result of results) {
        total++;
        if (!result.passed || result.retries > 0) {
          flaky++;
        }
      }
    }

    return total > 0 ? flaky / total : 0;
  }

  clearResults(): void {
    this.testResults.clear();
  }
}

export const testFlakeTracker = new TestFlakeTracker();
