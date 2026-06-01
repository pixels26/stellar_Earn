'use client';

import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';

interface BootstrapErrorFallbackProps {
  error: Error;
  resetError: () => void;
  componentName: string;
  retryCount?: number;
  showDetails?: boolean;
}

/**
 * Specialized error fallback component for API bootstrap failures.
 * Provides actionable recovery UI with better UX than default error boundary.
 */
export function BootstrapErrorFallback({
  error,
  resetError,
  componentName,
  retryCount = 0,
  showDetails = false,
}: BootstrapErrorFallbackProps) {
  const isNetworkError = error.message?.toLowerCase().includes('network') ||
    error.message?.toLowerCase().includes('failed to fetch');
  const isTimeoutError = error.message?.toLowerCase().includes('timeout');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full rounded-lg border-2 border-dashed border-red-700/50 bg-gradient-to-br from-red-950/30 to-red-900/10 p-6"
        role="alert"
        aria-live="assertive"
        aria-labelledby={`error-title-${componentName}`}
      >
        {/* Header with icon and title */}
        <div className="flex items-start gap-4">
          <div className="flex flex-shrink-0 items-center justify-center rounded-lg bg-red-900/40 p-3">
            {isNetworkError ? (
              <svg
                className="h-6 w-6 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.111 16.251a.375.375 0 01.75 0v5.816a.375.375 0 01-.75 0v-5.816zm4.5-1.748a.375.375 0 01.75 0v7.564a.375.375 0 01-.75 0v-7.564zm4.5-1.352a.375.375 0 01.75 0v8.916a.375.375 0 01-.75 0v-8.916z"
                />
              </svg>
            ) : isTimeoutError ? (
              <svg
                className="h-6 w-6 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="h-6 w-6 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4v2m0 4v2m5.5-8.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3
              id={`error-title-${componentName}`}
              className="font-semibold text-red-200 text-lg"
            >
              {isNetworkError
                ? `Network Error Loading ${componentName}`
                : isTimeoutError
                  ? `${componentName} Taking Too Long`
                  : `Failed to Load ${componentName}`}
            </h3>

            <p className="mt-2 text-sm text-red-300">
              {isNetworkError
                ? `Please check your internet connection and try again.`
                : isTimeoutError
                  ? `The request took too long. Your connection might be slow or the service is temporarily unavailable.`
                  : `We encountered an issue loading this section. Please try again or contact support if the problem persists.`}
            </p>

            {/* Show error details in development */}
            {showDetails && process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="cursor-pointer text-xs font-medium text-red-400 hover:text-red-300">
                  Error Details (Dev Only)
                </summary>
                <div className="mt-2 rounded-lg bg-red-950/50 p-3 font-mono text-xs text-red-300 overflow-auto max-h-48">
                  <div className="mb-2">
                    <strong>Message:</strong> {error.message}
                  </div>
                  {error.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap break-words">{error.stack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Recovery actions */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <button
                onClick={resetError}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-cyan-500 active:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-red-950/50 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`Retry loading ${componentName}`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {retryCount > 0 ? `Retry Again` : 'Try Again'}
              </button>

              <button
                onClick={() => window.location.href = '/'}
                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-red-800/50 bg-red-900/20 px-6 py-2.5 text-sm font-semibold text-red-200 transition-all duration-200 hover:bg-red-900/40 active:bg-red-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-red-950/50"
                aria-label="Navigate to homepage"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-3m0 0l7-4 7 4M5 10v10a1 1 0 001 1h3m10-11l2 3m-2-3V9m-6 11h3m6 0h3"
                  />
                </svg>
                Go Home
              </button>
            </div>

            {/* Retry attempts indicator */}
            {retryCount > 0 && (
              <div className="mt-4 flex items-center gap-2 text-xs text-red-400">
                <div className="h-1.5 w-1.5 rounded-full bg-red-400" aria-hidden="true" />
                <span>Retry attempts: {retryCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Recovery tips */}
        <div className="mt-6 rounded-lg bg-red-900/20 border border-red-800/30 p-4">
          <h4 className="text-xs font-semibold text-red-300 mb-2">What you can try:</h4>
          <ul className="space-y-1.5 text-xs text-red-300/80">
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">•</span>
              <span>Refresh the page</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">•</span>
              <span>Check your internet connection</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">•</span>
              <span>Try again in a few moments</span>
            </li>
          </ul>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
