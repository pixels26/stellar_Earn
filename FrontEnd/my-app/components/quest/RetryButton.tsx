'use client';

import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface RetryButtonProps {
  /** Whether to show the button (typically when there's a retryable error) */
  isVisible: boolean;
  /** Whether the retry is in progress */
  isLoading?: boolean;
  /** Callback when retry is clicked */
  onRetry: () => Promise<void>;
  /** Optional custom button text */
  buttonText?: string;
  /** Optional CSS class for the button */
  className?: string;
  /** Whether button should be full width */
  fullWidth?: boolean;
}

/**
 * Retry Button Component
 * Shows a CTA button for users to retry failed network requests.
 *
 * Features:
 * - Loading state with spinner
 * - Accessible with proper ARIA labels
 * - Keyboard navigable (Enter/Space)
 * - Error handling
 * - Dark mode support
 */
export function RetryButton({
  isVisible,
  isLoading = false,
  onRetry,
  buttonText = 'Retry',
  className = '',
  fullWidth = false,
}: RetryButtonProps) {
  const [error, setError] = useState<string | null>(null);

  if (!isVisible) return null;

  const handleClick = async () => {
    setError(null);
    try {
      await onRetry();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Retry failed. Please try again.';
      setError(message);
    }
  };

  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors';
  const sizeClasses = fullWidth ? 'w-full' : '';
  const stateClasses = isLoading
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
    : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600 dark:focus:ring-offset-zinc-900';

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`${baseClasses} ${sizeClasses} ${stateClasses} ${className}`}
        aria-label={isLoading ? 'Retrying request...' : 'Retry'}
        aria-busy={isLoading}
      >
        <RotateCcw
          className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
          aria-hidden="true"
        />
        <span>{isLoading ? 'Retrying...' : buttonText}</span>
      </button>
      {error && (
        <p
          className="text-xs text-red-600 dark:text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
