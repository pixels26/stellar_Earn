'use client';

import { memo } from 'react';
import { StatusBadge } from './StatusBadge';
import type { Submission } from '@/lib/types/submission';
import { formatRelativeDate } from '@/lib/utils/date';

interface SubmissionCardProps {
  submission: Submission;
  onClick?: (submission: Submission) => void;
}

export const SubmissionCard = memo(function SubmissionCard({
  submission,
  onClick,
}: SubmissionCardProps) {
  const handleClick = () => {
    onClick?.(submission);
  };

  const formattedDate = formatRelativeDate(submission.createdAt);

  return (
    <button
      onClick={handleClick}
      className="group cursor-pointer rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 text-left"
      aria-label={`View submission for ${submission.quest.title}`}
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {submission.quest.title}
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
            {submission.quest.description}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-500">
            <span>Submitted {formattedDate}</span>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {submission.quest.rewardAmount} {submission.quest.rewardAsset}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <StatusBadge status={submission.status} />
        </div>
      </div>
    </button>
  );
});

SubmissionCard.displayName = 'SubmissionCard';
