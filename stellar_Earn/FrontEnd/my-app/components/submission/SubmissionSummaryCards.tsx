'use client';

import type { Submission } from '@/lib/types/submission';
import { getSubmissionStats } from '@/lib/mock/submissions';

interface SubmissionSummaryCardsProps {
  submissions: Submission[];
}

export function SubmissionSummaryCards({
  submissions,
}: SubmissionSummaryCardsProps) {
  const stats = getSubmissionStats(submissions);

  const cards = [
    {
      label: 'Total Submissions',
      value: stats.total,
      borderColor: 'border-zinc-300 dark:border-zinc-700',
      bgColor: 'bg-white dark:bg-zinc-900',
      isHighlighted: true,
    },
    {
      label: 'Approved',
      value: stats.approved,
      borderColor: 'border-zinc-300 dark:border-zinc-700',
      bgColor: 'bg-white dark:bg-zinc-900',
      isHighlighted: false,
    },
    {
      label: 'Pending',
      value: stats.pending,
      borderColor: 'border-zinc-300 dark:border-zinc-700',
      bgColor: 'bg-white dark:bg-zinc-900',
      isHighlighted: false,
    },
    {
      label: 'Under Review',
      value: stats.underReview,
      borderColor: 'border-zinc-300 dark:border-zinc-700',
      bgColor: 'bg-white dark:bg-zinc-900',
      isHighlighted: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-lg border ${card.borderColor} ${card.bgColor} p-4`}
          style={
            card.isHighlighted
              ? {
                  backgroundColor: 'rgba(8, 158, 195, 0.1)',
                }
              : {}
          }
        >
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {card.label}
          </p>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
