# FE-028: Resilient Error Boundary for API Bootstrap Failure

## Overview

This document describes the implementation of a resilient error boundary system for handling API bootstrap failures in homepage widgets. The system provides automatic retry logic, user-friendly error messages, and recovery options for homepage components that fetch data during initialization.

## Features

### 1. **APIBootstrapErrorBoundary Component**

A React Error Boundary component specifically designed for handling API bootstrap failures in widgets.

#### Key Features:
- ✅ Catches render errors and async errors
- ✅ Automatic retry tracking
- ✅ User-friendly error UI with recovery actions
- ✅ Error reporting to Sentry
- ✅ Custom fallback component support
- ✅ Accessibility compliant (ARIA attributes)
- ✅ Development mode error details

#### Usage:

```tsx
import { APIBootstrapErrorBoundary } from '@/components/error/APIBootstrapErrorBoundary';
import { BootstrapErrorFallback } from '@/components/error/BootstrapErrorFallback';

function MyWidget() {
  return (
    <APIBootstrapErrorBoundary
      componentName="MyWidget"
      fallback={BootstrapErrorFallback}
      onError={(error) => console.log('Widget error:', error)}
    >
      <WidgetContent />
    </APIBootstrapErrorBoundary>
  );
}
```

#### Props:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `React.ReactNode` | ✅ | Component content to wrap |
| `componentName` | `string` | ✅ | Name for error reporting and UI |
| `fallback` | `React.ComponentType` | ❌ | Custom error fallback component |
| `onError` | `(error: Error, name: string) => void` | ❌ | Error callback for logging/tracking |
| `retryable` | `boolean` | ❌ | Whether errors are retryable (default: true) |
| `showDetails` | `boolean` | ❌ | Show error details in dev mode (default: false) |

### 2. **useAPIBootstrap Hook**

A custom React hook for managing API data fetching with automatic retry logic and error handling.

#### Key Features:
- ✅ Automatic retry with exponential backoff
- ✅ Loading state management
- ✅ Error tracking and monitoring
- ✅ Manual reset capability
- ✅ Timeout support
- ✅ Request cancellation (AbortController)
- ✅ Sentry integration

#### Usage:

```tsx
import { useAPIBootstrap } from '@/lib/hooks/useAPIBootstrap';

function MyComponent() {
  const { data, loading, error, retry, reset } = useAPIBootstrap(
    () => getQuests({ limit: 10 }),
    {
      retries: 3,
      initialDelay: 1000,
      componentName: 'FeaturedQuests',
      timeout: 30000,
      onError: (error) => console.error('Bootstrap error:', error),
    }
  );

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage error={error} onRetry={retry} />;
  return <QuestList quests={data} />;
}
```

#### Hook Return Type:

```typescript
{
  data: T | null;                    // Fetched data
  loading: boolean;                  // Loading state
  error: Error | null;               // Error object if failed
  isRetrying: boolean;               // Currently retrying
  retryCount: number;                // Number of manual retries
  retry: () => Promise<void>;        // Manual retry function
  reset: () => void;                 // Reset to initial state
  isRecoverable: boolean;            // Error is recoverable
  canRetry: boolean;                 // Can retry now
}
```

### 3. **BootstrapErrorFallback Component**

Specialized error fallback UI for API bootstrap failures with smart error detection and recovery suggestions.

#### Features:
- ✅ Network error detection
- ✅ Timeout error detection
- ✅ Context-specific icons and messages
- ✅ Recovery action buttons
- ✅ Retry attempt tracking
- ✅ Development error details
- ✅ Motion animations

#### Usage:

```tsx
import { BootstrapErrorFallback } from '@/components/error/BootstrapErrorFallback';

<BootstrapErrorFallback
  error={error}
  resetError={handleRetry}
  componentName="FeaturedQuests"
  retryCount={3}
  showDetails={process.env.NODE_ENV === 'development'}
/>
```

### 4. **Skeleton Loaders**

Loading skeleton components that provide visual feedback during API bootstrap.

#### Components:
- `FeaturedQuestsSkeleton` - Skeleton for quest carousel
- `WidgetLoadingSkeleton` - Generic widget loading skeleton

#### Usage:

```tsx
import { FeaturedQuestsSkeleton } from '@/components/homepage/SkeletonLoaders';

if (loading && data.length === 0) {
  return <FeaturedQuestsSkeleton />;
}
```

## Architecture

### Error Handling Flow

```
APIBootstrapErrorBoundary
    ↓
    ├─ Catches render errors via getDerivedStateFromError()
    │  └─ Displays BootstrapErrorFallback
    │
    └─ Component content
       ├─ useAPIBootstrap hook
       │  ├─ Fetch with retry logic
       │  ├─ Exponential backoff
       │  ├─ Timeout handling
       │  ├─ Error reporting to Sentry
       │  └─ Manual retry support
       │
       ├─ Loading state
       │  └─ Show SkeletonLoader
       │
       ├─ Error state
       │  ├─ Show error message
       │  ├─ Provide retry button
       │  └─ Show recovery options
       │
       └─ Success state
          └─ Render component content
```

### Retry Strategy

1. **Automatic Retries**: Configured via `MAX_RETRIES` (default: 3)
2. **Exponential Backoff**: `delay = initialDelay * 2^attemptNumber`
3. **Retryable Errors**: Network errors and 5xx status codes
4. **Non-retryable Errors**: 4xx status codes (except 429)
5. **Manual Retries**: User can trigger via UI button

### Error Classification

```typescript
// Network errors
- NETWORK_ERROR: Connection failed
- TIMEOUT_ERROR: Request exceeded timeout
- CONNECTION_FAILED: Network unavailable

// API errors
- VALIDATION_ERROR: 400 Bad Request
- UNAUTHORIZED: 401 Not authenticated
- FORBIDDEN: 403 Not authorized
- NOT_FOUND: 404 Resource not found
- SERVER_ERROR: 5xx Server errors

// Custom errors
- USER_DEFINED: Application-specific errors
```

## Implementation Examples

### Example 1: FeaturedQuests Widget

```tsx
// components/homepage/FeaturedQuests.tsx
'use client';

import { APIBootstrapErrorBoundary } from '@/components/error/APIBootstrapErrorBoundary';
import { BootstrapErrorFallback } from '@/components/error/BootstrapErrorFallback';

function FeaturedQuestsContent() {
  // Component implementation
}

export default function FeaturedQuests() {
  return (
    <APIBootstrapErrorBoundary
      componentName="Featured Quests"
      fallback={BootstrapErrorFallback}
      onError={(error) => {
        console.error('FeaturedQuests bootstrap error:', error);
      }}
    >
      <FeaturedQuestsContent />
    </APIBootstrapErrorBoundary>
  );
}
```

### Example 2: Custom Widget with useAPIBootstrap

```tsx
// Custom component using the hook
'use client';

import { useAPIBootstrap } from '@/lib/hooks/useAPIBootstrap';
import { FeaturedQuestsSkeleton } from './SkeletonLoaders';
import { ErrorMessage } from '@/components/error/ErrorMessage';

function MyDataWidget() {
  const { data, loading, error, retry } = useAPIBootstrap(
    () => fetchData(),
    {
      retries: 3,
      componentName: 'MyDataWidget',
      onError: (err) => console.error('Data fetch failed:', err),
    }
  );

  if (loading) return <FeaturedQuestsSkeleton />;
  if (error) return <ErrorMessage error={error} onRetry={retry} />;
  
  return <div>{/* Render data */}</div>;
}
```

## Testing

### Unit Tests

Tests are provided for all components and hooks:

1. **APIBootstrapErrorBoundary.test.tsx**
   - Error catching and display
   - Retry functionality
   - Custom fallback support
   - Callback execution
   - ARIA accessibility

2. **useAPIBootstrap.test.ts**
   - Successful data fetching
   - Error handling
   - Automatic retry logic
   - Manual retry support
   - Timeout handling
   - Cleanup on unmount

3. **FeaturedQuests.test.tsx**
   - Integration with error boundary
   - Loading state display
   - Error state display
   - Retry functionality

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- useAPIBootstrap.test.ts

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Performance Considerations

1. **Request Cancellation**: Uses AbortController to cancel in-flight requests
2. **Cleanup**: Properly cleans up timers and listeners on unmount
3. **Memory**: No memory leaks from lingering timers or promises
4. **Bundle Size**: Minimal impact (~4KB gzipped)

## Accessibility

- ✅ ARIA labels and descriptions
- ✅ Semantic HTML structure
- ✅ Keyboard navigation support
- ✅ Focus management
- ✅ Screen reader announcements
- ✅ Error state announcements via `aria-live="assertive"`

## Monitoring & Logging

### Sentry Integration

All errors are automatically reported to Sentry with:
- Component name
- Retry count
- Error type classification
- Timestamp
- User agent
- Stack trace

### Console Logging

Errors are also logged to console in development mode:
```
API Bootstrap Error - FeaturedQuests: Failed to fetch quests
```

## Migration Guide

### Before (Old Implementation)

```tsx
function FeaturedQuests() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getQuests()
      .then((data) => setQuests(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {loading && <Skeleton />}
      {error && <p>{error}</p>}
      {/* Content */}
    </div>
  );
}
```

### After (New Implementation)

```tsx
function FeaturedQuestsContent() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = useCallback(async () => {
    setRetryCount((prev) => prev + 1);
    // Refetch logic
  }, []);

  // ... improved implementation with better error UI

  return (
    <APIBootstrapErrorBoundary
      componentName="Featured Quests"
      fallback={BootstrapErrorFallback}
    >
      <div>
        {loading && <FeaturedQuestsSkeleton />}
        {error && <ErrorUI onRetry={handleRetry} />}
        {/* Content */}
      </div>
    </APIBootstrapErrorBoundary>
  );
}

export default function FeaturedQuests() {
  return (
    <APIBootstrapErrorBoundary componentName="Featured Quests">
      <FeaturedQuestsContent />
    </APIBootstrapErrorBoundary>
  );
}
```

## Troubleshooting

### Issue: Error boundary not catching errors

**Solution**: Ensure the error boundary wraps the component that throws the error. Async errors require try-catch or proper promise handling.

### Issue: Infinite retry loop

**Solution**: Check `shouldRetry` predicate in `useBootstrapWithErrorBoundary`. Set `retries` to a reasonable number (default: 3).

### Issue: Stale data after retry

**Solution**: Use the `reset()` function to clear state before refetching.

### Issue: Timeout errors too frequent

**Solution**: Increase `timeout` option or check backend performance.

## Future Enhancements

1. **Offline Detection**: Integrate with service worker for offline support
2. **Analytics**: Track error rates and recovery success
3. **Progressive Enhancement**: Graceful degradation for widgets
4. **Advanced Retry Strategies**: Circuit breaker pattern
5. **Cached Fallback**: Show cached data while fetching
6. **Request Prioritization**: Queue important requests

## Related Documentation

- [API Client Documentation](./api-client.md)
- [Error Handling Guide](./error-handling.md)
- [Testing Guide](./testing.md)
- [Accessibility Guidelines](./a11y.md)

## Support & Questions

For questions or issues, refer to:
1. Component storybook examples
2. Unit test examples
3. GitHub discussions
4. Team documentation wiki
