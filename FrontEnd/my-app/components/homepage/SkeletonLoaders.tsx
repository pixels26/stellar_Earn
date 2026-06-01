'use client';

import React from 'react';
import { motion } from 'framer-motion';

/**
 * Loading skeleton component for FeaturedQuests widget
 * Provides visual feedback during API bootstrap
 */
export function FeaturedQuestsSkeleton() {
  const skeletonItems = Array.from({ length: 3 });
  const shimmerAnimation = {
    initial: { backgroundPosition: '0% 0%' },
    animate: { backgroundPosition: '100% 0%' },
  };

  return (
    <div className="w-full">
      {/* Tabs skeleton */}
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div
            key={`tab-skeleton-${i}`}
            className="h-10 w-24 rounded-lg bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 bg-200% animate-pulse"
            variants={shimmerAnimation}
            initial="initial"
            animate="animate"
            transition={{ duration: 2, repeat: Infinity }}
          />
        ))}
      </div>

      {/* Quest cards skeleton */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {skeletonItems.map((_, i) => (
          <motion.div
            key={`quest-skeleton-${i}`}
            className="flex-shrink-0 w-80"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="h-full rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 backdrop-blur-sm">
              {/* Header with badge and title */}
              <div className="mb-4">
                <motion.div
                  className="h-6 w-20 rounded-full bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 bg-200%"
                  variants={shimmerAnimation}
                  initial="initial"
                  animate="animate"
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="mt-3 h-5 w-48 rounded bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 bg-200%"
                  variants={shimmerAnimation}
                  initial="initial"
                  animate="animate"
                  transition={{ duration: 2, repeat: Infinity, delay: 0.1 }}
                />
              </div>

              {/* Description skeleton */}
              <div className="space-y-2 mb-4">
                {Array.from({ length: 2 }).map((_, j) => (
                  <motion.div
                    key={`desc-line-${j}`}
                    className="h-4 w-full rounded bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 bg-200%"
                    variants={shimmerAnimation}
                    initial="initial"
                    animate="animate"
                    transition={{ duration: 2, repeat: Infinity, delay: 0.2 + j * 0.05 }}
                  />
                ))}
                <motion.div
                  className="h-4 w-3/4 rounded bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 bg-200%"
                  variants={shimmerAnimation}
                  initial="initial"
                  animate="animate"
                  transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                />
              </div>

              {/* Footer with reward skeleton */}
              <div className="flex justify-between items-center">
                <motion.div
                  className="h-5 w-24 rounded bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 bg-200%"
                  variants={shimmerAnimation}
                  initial="initial"
                  animate="animate"
                  transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
                />
                <motion.div
                  className="h-9 w-24 rounded bg-gradient-to-r from-cyan-700/30 via-cyan-600/20 to-cyan-700/30 bg-200%"
                  variants={shimmerAnimation}
                  initial="initial"
                  animate="animate"
                  transition={{ duration: 2, repeat: Infinity, delay: 0.35 }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Loading text */}
      <div className="mt-4 text-center">
        <motion.div
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-sm text-slate-400"
        >
          Loading featured quests...
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Generic loading skeleton for any widget
 */
export function WidgetLoadingSkeleton({
  lines = 3,
  showHeader = true,
  className = '',
}: {
  lines?: number;
  showHeader?: boolean;
  className?: string;
}) {
  const shimmerAnimation = {
    initial: { backgroundPosition: '0% 0%' },
    animate: { backgroundPosition: '100% 0%' },
  };

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {showHeader && (
        <motion.div
          className="h-7 w-40 rounded-lg bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 bg-200%"
          variants={shimmerAnimation}
          initial="initial"
          animate="animate"
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={`line-${i}`}
          className="h-4 w-full rounded bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 bg-200%"
          variants={shimmerAnimation}
          initial="initial"
          animate="animate"
          transition={{ duration: 2, repeat: Infinity, delay: (i + 1) * 0.1 }}
        />
      ))}
    </div>
  );
}
