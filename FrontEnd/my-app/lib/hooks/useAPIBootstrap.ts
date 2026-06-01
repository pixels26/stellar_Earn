'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { withRetry } from '@/lib/api/client';
import { logError } from '@/lib/utils/error-handler';
import type { AppError } from '@/lib/utils/error-handler';
import * as Sentry from '@sentry/nextjs';

interface UseAPIBootstrapOptions {
  retries?: number;
  initialDelay?: number;
  onError?: (error: Error) => void;
  componentName?: string;
  timeout?: number;
}

interface APIBootstrapState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isRetrying: boolean;
  retryCount: number;
}

/**
 * Hook for safely handling API calls during component bootstrap.
 * Provides automatic retry logic, error handling, and recovery.
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Loading state management
 * - Error tracking and monitoring
 * - Manual reset capability
 * - Timeout support
 * - Request cancellation
 *
 * @example
 * ```tsx
 * const { data, loading, error, retry } = useAPIBootstrap(
 *   () => getQuests({ limit: 10 }),
 *   {
 *     retries: 3,
 *     componentName: 'FeaturedQuests',
 *   }
 * );
 *
 * if (loading) return <LoadingSkeleton />;
 * if (error) return <ErrorMessage error={error} onRetry={retry} />;
 * return <QuestCarousel quests={data} />;
 * ```
 */
export function useAPIBootstrap<T>(
  fetchFn: () => Promise<T>,
  options: UseAPIBootstrapOptions = {}
) {
  const {
    retries = 3,
    initialDelay = 1000,
    onError,
    componentName = 'Unknown',
    timeout = 30000,
  } = options;

  const [state, setState] = useState<APIBootstrapState<T>>({
    data: null,
    loading: true,
    error: null,
    isRetrying: false,
    retryCount: 0,
  });

  // Refs for cleanup and tracking
  const cancelRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Execute the fetch with retry logic and error handling
   */
  const executeFetch = useCallback(async () => {
    try {
      // Create a new cancel token for this request
      cancelRef.current = new AbortController();

      // Set timeout
      const timeoutPromise = new Promise((_, reject) => {
        timeoutRef.current = setTimeout(
          () => reject(new Error(`API request timed out after ${timeout}ms`)),
          timeout
        );
      });

      // Race between the fetch and timeout
      const result = await Promise.race([
        withRetry(fetchFn, retries, initialDelay),
        timeoutPromise,
      ]);

      // Clear timeout if successful
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          data: result as T,
          loading: false,
          error: null,
          isRetrying: false,
        }));
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      // Log the error
      logError(error, `API Bootstrap Failed - ${componentName}`);

      // Report to monitoring
      Sentry.captureException(error, {
        tags: {
          component: componentName,
          errorType: 'bootstrap',
          retries: retries.toString(),
        },
        contexts: {
          bootstrap: {
            componentName,
            retryCount: state.retryCount + 1,
            timestamp: new Date().toISOString(),
          },
        },
      });

      // Call onError callback if provided
      onError?.(error);

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          error,
          loading: false,
          isRetrying: false,
        }));
      }

      throw error;
    }
  }, [fetchFn, retries, initialDelay, onError, componentName, timeout, state.retryCount]);

  /**
   * Manual retry function for user-initiated retries
   */
  const retry = useCallback(async () => {
    if (isMountedRef.current) {
      setState((prev) => ({
        ...prev,
        loading: true,
        isRetrying: true,
        retryCount: prev.retryCount + 1,
        error: null,
      }));
    }

    try {
      await executeFetch();
    } catch (err) {
      // Error already handled in executeFetch
    }
  }, [executeFetch]);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    if (isMountedRef.current) {
      setState({
        data: null,
        loading: true,
        error: null,
        isRetrying: false,
        retryCount: 0,
      });
    }

    // Cancel any in-flight requests
    if (cancelRef.current) {
      cancelRef.current.abort();
    }

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  /**
   * Initial data fetch on mount
   */
  useEffect(() => {
    executeFetch();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;

      // Cancel any in-flight requests
      if (cancelRef.current) {
        cancelRef.current.abort();
      }

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [executeFetch]);

  return {
    ...state,
    retry,
    reset,
    isRecoverable: state.error !== null,
    canRetry: !state.loading && state.error !== null,
  };
}

/**
 * Advanced hook that combines error boundary with API bootstrap handling.
 * Provides even more sophisticated error recovery patterns.
 */
export function useBootstrapWithErrorBoundary<T>(
  fetchFn: () => Promise<T>,
  options: UseAPIBootstrapOptions & {
    fallbackData?: T;
    shouldRetry?: (error: Error, attempt: number) => boolean;
  } = {}
) {
  const {
    fallbackData,
    shouldRetry,
    ...apiOptions
  } = options;

  const state = useAPIBootstrap(fetchFn, apiOptions);

  /**
   * Smart retry that respects shouldRetry predicate
   */
  const smartRetry = useCallback(async () => {
    if (shouldRetry && !shouldRetry(state.error!, state.retryCount)) {
      // Don't retry if shouldRetry returns false
      return;
    }

    return state.retry();
  }, [state, shouldRetry]);

  return {
    ...state,
    retry: smartRetry,
    data: state.data || fallbackData || null,
  };
}
