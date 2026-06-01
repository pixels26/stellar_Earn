'use client';

import { memo } from 'react';
import { StatusBadge } from './StatusBadge';
import type { Submission } from '@/lib/types/submission';
import { formatShortDate } from '@/lib/utils/date';

interface SubmissionsTableProps {
  submissions: Submission[];
  onSubmissionClick?: (submission: Submission) => void;
}

function truncateHash(hash: string, length = 8): string {
  if (!hash || hash.length <= length * 2) return hash;
  return `${hash.substring(0, length)}...${hash.substring(hash.length - length)}`;
}

function getProofDisplay(proof: Record<string, unknown>): string {
  if (!proof || Object.keys(proof).length === 0) return '-';
  if (proof.hash && typeof proof.hash === 'string') {
    return truncateHash(proof.hash);
  }
  return 'View';
}

export const SubmissionsTable = memo(function SubmissionsTable({
  submissions,
  onSubmissionClick,
}: SubmissionsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full divide-y divide-zinc-200 dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-800">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
            >
              Submission ID
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
            >
              Quest
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
            >
              Submitted
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
            >
              Status
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
            >
              Reward
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
            >
              Proof
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
          {submissions.map((submission) => {
            const proofDisplay = getProofDisplay(submission.proof);
            const hasProof = proofDisplay !== '-';

            return (
              <tr key={submission.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  <button
                    type="button"
                    onClick={() => onSubmissionClick?.(submission)}
                    className="w-full text-left"
                    aria-label={`View submission ${submission.id}`}
                  >
                    {submission.id}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                  <button
                    type="button"
                    onClick={() => onSubmissionClick?.(submission)}
                    className="w-full text-left"
                    aria-label={`View submission for ${submission.quest.title}`}
                  >
                    {submission.quest.title}
                  </button>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                  <button
                    type="button"
                    onClick={() => onSubmissionClick?.(submission)}
                    className="w-full text-left"
                    aria-label={`View submission date ${submission.id}`}
                  >
                    {formatShortDate(submission.createdAt)}
                  </button>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <button
                    type="button"
                    onClick={() => onSubmissionClick?.(submission)}
                    className="w-full text-left"
                    aria-label={`View submission status ${submission.id}`}
                  >
                    <StatusBadge status={submission.status} />
                  </button>
                </td>
                <td
                  className={`whitespace-nowrap px-6 py-4 text-sm font-medium ${
                    Number(submission.quest.rewardAmount) > 0
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSubmissionClick?.(submission)}
                    className="w-full text-left"
                    aria-label={`View reward for submission ${submission.id}`}
                  >
                    {submission.quest.rewardAmount} {submission.quest.rewardAsset}
                  </button>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                  {hasProof ? (
                    <button
                      type="button"
                      onClick={() => onSubmissionClick?.(submission)}
                      className="flex w-full items-center gap-2 text-left"
                      aria-label={`View proof for submission ${submission.id}`}
                    >
                      <span>{proofDisplay}</span>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </button>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

SubmissionsTable.displayName = 'SubmissionsTable';
