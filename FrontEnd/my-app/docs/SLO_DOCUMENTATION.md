# Frontend SLO (Service Level Objectives) Documentation

## Overview

This document describes the frontend SLO implementation for the StellarEarn application, including error rate, p95 load time, and test flake rate monitoring and reporting.

## SLO Definitions

### Error Rate SLO

**Target**: 1% error rate (0.01)
- **Warning Threshold**: 2% (0.02)
- **Critical Threshold**: 5% (0.05)

The error rate SLO tracks the percentage of user requests that result in errors. Errors are captured via Sentry integration and include JavaScript errors, network failures, and other runtime exceptions.

**Calculation**: `Error Rate = Total Errors / Total Requests`

### p95 Load Time SLO

**Target**: 2000ms (2 seconds)
- **Warning Threshold**: 3000ms (3 seconds)
- **Critical Threshold**: 5000ms (5 seconds)

The p95 load time SLO tracks the 95th percentile of page load times, ensuring that 95% of users experience load times within the target. This metric uses Web Vitals (LCP - Largest Contentful Paint) as the primary indicator.

**Metrics Tracked**:
- LCP (Largest Contentful Paint)
- FCP (First Contentful Paint)
- TTFB (Time to First Byte)
- INP (Interaction to Next Paint)
- CLS (Cumulative Layout Shift)

### Test Flake Rate SLO

**Target**: 2% flake rate (0.02)
- **Warning Threshold**: 5% (0.05)
- **Critical Threshold**: 10% (0.10)

The test flake rate SLO tracks the percentage of tests that fail intermittently or require retries. A test is considered flaky if it fails after retries or has retry attempts.

**Calculation**: `Flake Rate = Flaky Tests / Total Tests`

## Architecture

### Core Components

#### 1. SLO Configuration (`lib/slo/config.ts`)
- Defines SLO thresholds and targets
- Configures time windows and sampling rates
- Environment-specific enablement

#### 2. SLO Tracker (`lib/slo/tracker.ts`)
- Core tracking logic for all SLO metrics
- In-memory metric storage (can be extended to use persistent storage)
- Calculates error rates, performance percentiles, and test flake rates
- Provides metric status evaluation with trend analysis

#### 3. SLO Reporter (`lib/slo/reporter.ts`)
- Generates comprehensive SLO reports
- Evaluates overall system health
- Formats reports for display
- Checks for alert conditions

#### 4. Test Flake Tracker (`lib/slo/test-tracker.ts`)
- Tracks individual test results
- Identifies flaky tests based on failures and retries
- Calculates per-test and overall flake rates

#### 5. SLO Dashboard (`components/admin/SLODashboard.tsx`)
- React component for visualizing SLO data
- Real-time metric display with status indicators
- Alert notifications for threshold breaches
- Trend visualization

### Integration Points

#### Sentry Integration (`lib/sentry.ts`)
- Errors are automatically tracked via Sentry's `beforeSend` hook
- Error types are categorized for detailed analysis
- Error counts feed into the error rate SLO calculation

#### Web Vitals Integration (`lib/utils/performance.ts`)
- Performance metrics are tracked using the `web-vitals` library
- Metrics are sampled to reduce overhead (10% sampling in production)
- All metrics feed into the p95 load time SLO calculation

#### Test Integration
- Vitest and Playwright test results can be integrated
- Test flake tracker records results and calculates flake rates
- Retry information is captured for flake detection

## Usage

### Tracking Errors

Errors are automatically tracked via Sentry. No manual tracking required for production errors.

```typescript
// Manual error tracking (if needed)
import { sloTracker } from '@/lib/slo';

sloTracker.trackError('CustomError', 1);
```

### Tracking Performance

Performance metrics are automatically tracked via the PerformanceMonitor component. No manual tracking required.

```typescript
// Manual performance tracking (if needed)
import { sloTracker } from '@/lib/slo';

sloTracker.trackPerformance('LCP', 1500);
```

### Tracking Test Results

Test results can be tracked manually or via test framework integration:

```typescript
import { testFlakeTracker } from '@/lib/slo';

testFlakeTracker.recordTestResult({
  testName: 'myTest',
  passed: true,
  retries: 0,
  duration: 100,
  file: 'test.spec.ts',
});
```

### Generating Reports

```typescript
import { sloReporter } from '@/lib/slo';

// Generate SLO report
const report = sloReporter.generateReport();

// Check for alerts
const alerts = sloReporter.checkAlerts(report);

// Format for display
const formatted = sloReporter.formatReportForDisplay(report);
```

### Using the Dashboard

Add the SLO dashboard to your admin interface:

```tsx
import { SLODashboard } from '@/components/admin/SLODashboard';

export default function AdminPage() {
  return <SLODashboard />;
}
```

## Configuration

### Environment Variables

```bash
# Enable SLO tracking (default: true for production/staging)
NEXT_PUBLIC_SLO_ENABLED=true

# Sentry DSN for error tracking
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Performance sampling rate (default: 0.1)
NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE=0.1
```

### Custom Thresholds

Modify thresholds in `lib/slo/config.ts`:

```typescript
export const DEFAULT_SLO_THRESHOLDS: SLOThresholds = {
  errorRate: {
    target: 0.01,
    warning: 0.02,
    critical: 0.05,
  },
  p95LoadTime: {
    target: 2000,
    warning: 3000,
    critical: 5000,
  },
  testFlakeRate: {
    target: 0.02,
    warning: 0.05,
    critical: 0.10,
  },
};
```

## Testing

### Running SLO Tests

```bash
# Run all SLO tests
npm test -- lib/slo

# Run with coverage
npm run test:coverage -- lib/slo
```

### Test Coverage

The SLO system includes comprehensive unit tests for:
- Tracker functionality
- Reporter functionality
- Test flake tracker functionality
- Metric status calculation
- Trend analysis

## Monitoring and Alerting

### Status Levels

- **Healthy**: All metrics within target thresholds
- **Warning**: One or more metrics approaching critical thresholds
- **Critical**: One or more metrics exceeding critical thresholds

### Trend Analysis

- **Improving**: Metrics are getting better over time
- **Degrading**: Metrics are getting worse over time
- **Stable**: Metrics are consistent over time

### Alert Channels

Alerts can be configured to send to:
- Sentry (for error tracking)
- Console (for development)
- Custom webhooks (can be added)

## Best Practices

1. **Regular Monitoring**: Check the SLO dashboard regularly, especially after deployments
2. **Threshold Tuning**: Adjust thresholds based on your application's requirements and user expectations
3. **Trend Analysis**: Pay attention to trends, not just current values
4. **Root Cause Analysis**: Investigate SLO breaches to identify underlying issues
5. **Test Stability**: Address flaky tests promptly to maintain low flake rates
6. **Performance Optimization**: Use p95 load time data to identify performance bottlenecks

## Troubleshooting

### No SLO Data Available

- Ensure SLO tracking is enabled for your environment
- Check that Sentry is properly configured
- Verify that the PerformanceMonitor component is rendered

### High Error Rate

- Check Sentry for error details
- Review recent code changes
- Check for third-party service issues

### High p95 Load Time

- Analyze Web Vitals data
- Check for large assets
- Review bundle size
- Consider lazy loading

### High Test Flake Rate

- Review test logs for patterns
- Check for timing issues
- Verify test isolation
- Consider increasing test timeouts

## Future Enhancements

Potential improvements for the SLO system:

1. **Persistent Storage**: Replace in-memory storage with database persistence
2. **Historical Data**: Store long-term historical data for trend analysis
3. **Custom Metrics**: Allow adding custom SLO metrics
4. **Granular Time Windows**: Support multiple time windows (hourly, daily, weekly)
5. **Alert Integration**: Integrate with PagerDuty, Slack, or other alerting systems
6. **Automated Reporting**: Schedule automated SLO reports
7. **A/B Testing Support**: Track SLOs for different feature flags
8. **Geographic Breakdown**: Track SLOs by region

## References

- [Web Vitals](https://web.dev/vitals/)
- [Sentry Documentation](https://docs.sentry.io/)
- [SRE Book - SLOs](https://sre.google/sre-book/service-level-objectives/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
