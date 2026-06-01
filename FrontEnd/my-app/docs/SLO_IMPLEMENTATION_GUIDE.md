# SLO Implementation Guide

## Quick Start

This guide will help you get started with the SLO (Service Level Objectives) system in the StellarEarn frontend.

## Installation

The SLO system is already integrated into the frontend. No additional installation required.

## Setup

### 1. Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Enable SLO tracking
NEXT_PUBLIC_SLO_ENABLED=true

# Sentry DSN (required for error tracking)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn-here

# Performance sampling rate (0.0 to 1.0)
NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE=0.1
```

### 2. Verify Integration

The SLO system is automatically integrated through:

1. **Sentry Integration** (`lib/sentry.ts`): Errors are tracked automatically
2. **Performance Monitor** (`components/ui/PerformanceMonitor.tsx`): Web vitals are tracked automatically
3. **Layout Integration**: The PerformanceMonitor is included in the root layout

### 3. Access the Dashboard

To view SLO data, add the dashboard to your admin interface:

```tsx
// app/admin/slo/page.tsx
import { SLODashboard } from '@/components/admin/SLODashboard';

export default function SLOPage() {
  return <SLODashboard />;
}
```

## Manual Tracking

### Tracking Custom Errors

```typescript
import { sloTracker } from '@/lib/slo';

// Track a custom error
sloTracker.trackError('CustomErrorType', 1);
```

### Tracking Custom Performance Metrics

```typescript
import { sloTracker } from '@/lib/slo';

// Track a custom performance metric
sloTracker.trackPerformance('CustomMetric', 1500);
```

### Tracking Test Results

```typescript
import { testFlakeTracker } from '@/lib/slo';

// Track a test result
testFlakeTracker.recordTestResult({
  testName: 'myTest',
  passed: true,
  retries: 0,
  duration: 100,
  file: 'test.spec.ts',
});
```

## Running Tests

```bash
# Run SLO tests
npm test -- lib/slo

# Run with coverage
npm run test:coverage -- lib/slo
```

## Monitoring SLOs

### Dashboard

The SLO dashboard provides:
- Real-time metric display
- Status indicators (healthy/warning/critical)
- Trend analysis
- Alert notifications

### Programmatic Access

```typescript
import { sloReporter } from '@/lib/slo';

// Generate a report
const report = sloReporter.generateReport();

// Check for alerts
const alerts = sloReporter.checkAlerts(report);

// Format for display
const formatted = sloReporter.formatReportForDisplay(report);

console.log(formatted);
```

## Customization

### Adjusting Thresholds

Edit `lib/slo/config.ts`:

```typescript
export const DEFAULT_SLO_THRESHOLDS: SLOThresholds = {
  errorRate: {
    target: 0.01,    // 1%
    warning: 0.02,   // 2%
    critical: 0.05,  // 5%
  },
  p95LoadTime: {
    target: 2000,   // 2 seconds
    warning: 3000,   // 3 seconds
    critical: 5000,  // 5 seconds
  },
  testFlakeRate: {
    target: 0.02,   // 2%
    warning: 0.05,   // 5%
    critical: 0.10,  // 10%
  },
};
```

### Environment-Specific Configuration

```typescript
export const SLO_CONFIG = {
  enabled: {
    production: true,
    staging: true,
    development: false,  // Disabled in development
  },
  // ... other config
};
```

## Troubleshooting

### Issue: No SLO data appearing

**Solution**:
1. Check that `NEXT_PUBLIC_SLO_ENABLED` is set to `true`
2. Verify Sentry DSN is configured
3. Ensure PerformanceMonitor is in the layout
4. Check browser console for errors

### Issue: High error rate

**Solution**:
1. Check Sentry dashboard for error details
2. Review recent code changes
3. Check for third-party service outages

### Issue: High p95 load time

**Solution**:
1. Analyze Web Vitals data
2. Check bundle size
3. Optimize images and assets
4. Consider code splitting

### Issue: High test flake rate

**Solution**:
1. Review test logs for patterns
2. Check for timing issues
3. Ensure proper test isolation
4. Increase test timeouts if needed

## Best Practices

1. **Monitor Regularly**: Check the dashboard after deployments
2. **Set Realistic Targets**: Base thresholds on user expectations
3. **Investigate Trends**: Look at trends, not just current values
4. **Fix Flaky Tests**: Address flaky tests promptly
5. **Optimize Performance**: Use p95 data to identify bottlenecks
6. **Document Changes**: Keep documentation updated when changing thresholds

## Support

For issues or questions about the SLO system:
- Check the main documentation: `docs/SLO_DOCUMENTATION.md`
- Review test files in `lib/slo/__tests__/`
- Open an issue in the repository
