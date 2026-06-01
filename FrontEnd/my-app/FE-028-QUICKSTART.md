# FE-028: Quick Start Guide

## Overview
This guide provides quick examples for using the new error boundary components and hooks for handling API bootstrap failures.

## Installation

No additional installation required! The components are already available in your project.

## Quick Examples

### Example 1: Wrap Any Component with Error Boundary

```tsx
import { APIBootstrapErrorBoundary } from '@/components/error/APIBootstrapErrorBoundary';
import { BootstrapErrorFallback } from '@/components/error/BootstrapErrorFallback';

export default function MyWidget() {
  return (
    <APIBootstrapErrorBoundary
      componentName="MyWidget"
      fallback={BootstrapErrorFallback}
    >
      <YourComponent />
    </APIBootstrapErrorBoundary>
  );
}
```

### Example 2: Use the Hook for API Calls

```tsx
import { useAPIBootstrap } from '@/lib/hooks/useAPIBootstrap';
import { FeaturedQuestsSkeleton } from '@/components/homepage/SkeletonLoaders';

function DataComponent() {
  const { data, loading, error, retry } = useAPIBootstrap(
    () => yourApiCall(),
    { retries: 3, componentName: 'DataComponent' }
  );

  if (loading) return <FeaturedQuestsSkeleton />;
  if (error) return <ErrorUI error={error} onRetry={retry} />;
  return <YourComponent data={data} />;
}
```

### Example 3: Custom Error Fallback

```tsx
const CustomFallback = ({ error, resetError, componentName }) => (
  <div className="custom-error">
    <h3>Custom Error for {componentName}</h3>
    <p>{error.message}</p>
    <button onClick={resetError}>Retry</button>
  </div>
);

export default function Widget() {
  return (
    <APIBootstrapErrorBoundary
      componentName="Widget"
      fallback={CustomFallback}
    >
      <YourComponent />
    </APIBootstrapErrorBoundary>
  );
}
```

### Example 4: Full Configuration

```tsx
import { useAPIBootstrap } from '@/lib/hooks/useAPIBootstrap';

const { data, loading, error, retry, reset, isRecoverable } = useAPIBootstrap(
  async () => {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('API failed');
    return response.json();
  },
  {
    retries: 5,                    // Number of automatic retries
    initialDelay: 1000,            // Starting delay in ms
    timeout: 30000,                // Request timeout
    componentName: 'DataWidget',   // For logging
    onError: (error) => {
      console.error('API Error:', error);
      // Send to analytics, etc.
    },
  }
);
```

## API Reference

### APIBootstrapErrorBoundary Props

```typescript
interface APIBootstrapErrorBoundaryProps {
  children: React.ReactNode;              // Required: Component to wrap
  componentName: string;                  // Required: Component name for logging
  fallback?: React.ComponentType<{        // Optional: Custom error UI
    error: Error;
    resetError: () => void;
    componentName: string;
  }>;
  onError?: (error: Error, componentName: string) => void;  // Optional: Error callback
  retryable?: boolean;                    // Optional: Allow retries
  showDetails?: boolean;                  // Optional: Show error details in dev
}
```

### useAPIBootstrap Hook

```typescript
const {
  data,              // T | null - The fetched data
  loading,           // boolean - Loading state
  error,             // Error | null - Error if failed
  isRetrying,        // boolean - Currently retrying
  retryCount,        // number - Number of manual retries
  retry,             // () => Promise<void> - Manual retry function
  reset,             // () => void - Reset to initial state
  isRecoverable,     // boolean - Error is recoverable
  canRetry,          // boolean - Can retry now
} = useAPIBootstrap(fetchFn, options);
```

## Common Patterns

### Pattern 1: API Data Fetch
```tsx
function QuestsList() {
  const { data: quests, loading, error, retry } = useAPIBootstrap(
    () => getQuests({ limit: 10 }),
    { componentName: 'QuestsList' }
  );

  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} onRetry={retry} />;
  return <QuestCarousel quests={quests} />;
}
```

### Pattern 2: Nested Error Boundaries
```tsx
function Page() {
  return (
    <APIBootstrapErrorBoundary componentName="Page">
      <Section>
        <APIBootstrapErrorBoundary componentName="Widget1">
          <Widget1 />
        </APIBootstrapErrorBoundary>
        <APIBootstrapErrorBoundary componentName="Widget2">
          <Widget2 />
        </APIBootstrapErrorBoundary>
      </Section>
    </APIBootstrapErrorBoundary>
  );
}
```

### Pattern 3: Error Callback & Logging
```tsx
function TrackedComponent() {
  const { data, error } = useAPIBootstrap(
    () => fetchData(),
    {
      componentName: 'TrackedComponent',
      onError: (error) => {
        // Send to analytics
        analytics.logError({
          type: 'bootstrap_error',
          component: 'TrackedComponent',
          message: error.message,
          timestamp: new Date(),
        });
      },
    }
  );

  // Component logic...
}
```

## Real-World Example: FeaturedQuests

See `components/homepage/FeaturedQuests.tsx` for a complete implementation example that demonstrates:
- Error boundary wrapper
- Hook-based error handling
- Loading skeleton display
- Error message display with retry
- Request cancellation
- Retry attempt tracking

## Troubleshooting

### Error Not Being Caught?
Make sure the error boundary wraps the component that throws the error.

```tsx
// ✅ Correct
<APIBootstrapErrorBoundary componentName="Widget">
  <Widget />  {/* Error here will be caught */}
</APIBootstrapErrorBoundary>

// ❌ Wrong
<Widget />
<APIBootstrapErrorBoundary componentName="Widget">
  {/* Error in Widget above won't be caught */}
</APIBootstrapErrorBoundary>
```

### Infinite Retry Loop?
Set `retries` to a reasonable number:

```tsx
// ❌ Too many retries
useAPIBootstrap(fetchFn, { retries: 100 });

// ✅ Reasonable
useAPIBootstrap(fetchFn, { retries: 3 });
```

### Timeout Too Short?
Increase the timeout for slow APIs:

```tsx
useAPIBootstrap(fetchFn, { 
  timeout: 60000  // 60 seconds for slow endpoints
});
```

## Performance Tips

1. **Use skeletons** instead of spinners for better UX
2. **Set appropriate timeout** based on endpoint performance
3. **Adjust retry count** for reliability vs user experience
4. **Monitor error rates** in Sentry
5. **Clean up timers** on component unmount (hook handles this automatically)

## Testing

For test examples, see:
- `components/error/APIBootstrapErrorBoundary.test.tsx`
- `lib/hooks/useAPIBootstrap.test.ts`
- `components/homepage/FeaturedQuests.test.tsx`

## Next Steps

1. ✅ Review `FE-028-IMPLEMENTATION.md` for detailed documentation
2. ✅ Check `FeaturedQuests.tsx` for a real-world example
3. ✅ Read the test files for usage patterns
4. ✅ Wrap your data-fetching components with error boundary
5. ✅ Test error scenarios in development
6. ✅ Monitor Sentry after deployment

## Additional Resources

- **Full Documentation**: `docs/FE-028-IMPLEMENTATION.md`
- **Implementation Report**: `FE-028-IMPLEMENTATION-REPORT.md`
- **Implementation Summary**: `docs/FE-028-IMPLEMENTATION-SUMMARY.md`
- **Example Component**: `components/homepage/FeaturedQuests.tsx`
- **Test Examples**: See test files in components and lib directories

## Support

For questions or issues:
1. Check the implementation documentation
2. Review test examples
3. Look at the FeaturedQuests implementation
4. Check component JSDoc comments
