'use client';

import { useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';

/**
 * Hook to detect and track online/offline status.
 * Listens to browser's navigator.onLine API and online/offline events.
 * Automatically syncs the online status to the global store.
 *
 * Usage:
 *   const { isOnline, retryFailedRequest } = useOnlineStatus();
 */
export function useOnlineStatus() {
  const isOnline = useStore((s) => s.isOnline);
  const hasRetryableError = useStore((s) => s.hasRetryableError);
  const retryFunction = useStore((s) => s.retryFunction);
  const setOnlineStatus = useStore((s) => s.setOnlineStatus);
  const clearRetryableError = useStore((s) => s.clearRetryableError);

  // Handle online event
  const handleOnline = useCallback(() => {
    setOnlineStatus(true);
    // If there was a retryable error, clear it now that we're back online
    if (hasRetryableError && retryFunction) {
      setTimeout(() => {
        clearRetryableError();
      }, 500);
    }
  }, [setOnlineStatus, hasRetryableError, retryFunction, clearRetryableError]);

  // Handle offline event
  const handleOffline = useCallback(() => {
    setOnlineStatus(false);
  }, [setOnlineStatus]);

  // Set up event listeners
  useEffect(() => {
    // Check initial status
    setOnlineStatus(navigator.onLine);

    // Listen to online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus, handleOnline, handleOffline]);

  // Retry the failed request
  const retryFailedRequest = useCallback(async () => {
    if (retryFunction) {
      try {
        await retryFunction();
        clearRetryableError();
      } catch (error) {
        console.error('Retry failed:', error);
        // Keep the retry button visible if retry fails
      }
    }
  }, [retryFunction, clearRetryableError]);

  return {
    isOnline,
    hasRetryableError,
    retryFailedRequest,
  };
}
