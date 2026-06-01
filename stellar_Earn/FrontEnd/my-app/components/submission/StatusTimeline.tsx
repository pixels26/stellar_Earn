'use client';

import { SubmissionStatus } from '@/lib/types/submission';
import type { Submission } from '@/lib/types/submission';
import { formatTimelineDate } from '@/lib/utils/date';

interface StatusTimelineProps {
  submission: Submission;
}

interface TimelineStep {
  status: SubmissionStatus | 'CREATED';
  label: string;
  timestamp?: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

export function StatusTimeline({ submission }: StatusTimelineProps) {
  const steps: TimelineStep[] = [
    {
      status: 'CREATED',
      label: 'Submitted',
      timestamp: submission.createdAt,
      isCompleted: true,
      isCurrent: false,
    },
    {
      status: SubmissionStatus.PENDING,
      label: 'Pending Review',
      timestamp:
        submission.status === SubmissionStatus.PENDING
          ? submission.updatedAt
          : undefined,
      isCompleted:
        submission.status !== SubmissionStatus.PENDING &&
        submission.status !== SubmissionStatus.UNDER_REVIEW,
      isCurrent: submission.status === SubmissionStatus.PENDING,
    },
  ];

  // Add Under Review step if status is UNDER_REVIEW or beyond
  if (
    submission.status === SubmissionStatus.UNDER_REVIEW ||
    submission.status === SubmissionStatus.APPROVED ||
    submission.status === SubmissionStatus.REJECTED ||
    submission.status === SubmissionStatus.PAID
  ) {
    steps.push({
      status: SubmissionStatus.UNDER_REVIEW,
      label: 'Under Review',
      timestamp:
        submission.status === SubmissionStatus.UNDER_REVIEW
          ? submission.updatedAt
          : undefined,
      isCompleted: submission.status !== SubmissionStatus.UNDER_REVIEW,
      isCurrent: submission.status === SubmissionStatus.UNDER_REVIEW,
    });
  }

  // Add Approval/Rejection step
  if (
    submission.status === SubmissionStatus.APPROVED ||
    submission.status === SubmissionStatus.REJECTED ||
    submission.status === SubmissionStatus.PAID
  ) {
    steps.push({
      status:
        submission.status === SubmissionStatus.REJECTED
          ? SubmissionStatus.REJECTED
          : SubmissionStatus.APPROVED,
      label:
        submission.status === SubmissionStatus.REJECTED
          ? 'Rejected'
          : 'Approved',
      timestamp: submission.updatedAt,
      isCompleted: true,
      isCurrent:
        submission.status === SubmissionStatus.APPROVED ||
        submission.status === SubmissionStatus.REJECTED,
    });
  }

  // Add Paid step if approved or paid
  if (
    submission.status === SubmissionStatus.APPROVED ||
    submission.status === SubmissionStatus.PAID
  ) {
    steps.push({
      status: SubmissionStatus.PAID,
      label: 'Paid',
      timestamp:
        submission.status === SubmissionStatus.PAID
          ? submission.updatedAt
          : undefined,
      isCompleted: submission.status === SubmissionStatus.PAID,
      isCurrent: submission.status === SubmissionStatus.PAID,
    });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Status Timeline
      </h3>
      <div className="relative">
        {steps.map((step, index) => (
          <div key={step.status} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Timeline line */}
            {index < steps.length - 1 && (
              <div
                className={`absolute left-[7px] top-6 h-full w-0.5 ${
                  step.isCompleted
                    ? 'bg-blue-600 dark:bg-blue-500'
                    : 'bg-zinc-200 dark:bg-zinc-700'
                }`}
                aria-hidden="true"
              />
            )}

            {/* Status dot */}
            <div
              className={`relative z-10 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
                step.isCompleted
                  ? 'bg-blue-600 dark:bg-blue-500'
                  : step.isCurrent
                    ? 'bg-blue-600 dark:bg-blue-500 ring-4 ring-blue-100 dark:ring-blue-900/30'
                    : 'bg-zinc-200 dark:bg-zinc-700'
              }`}
            >
              {step.isCompleted && (
                <svg
                  className="h-2.5 w-2.5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`text-sm font-medium ${
                    step.isCurrent || step.isCompleted
                      ? 'text-zinc-900 dark:text-zinc-50'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {step.label}
                </p>
                {step.timestamp && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    {formatTimelineDate(step.timestamp)}
                  </span>
                )}
              </div>
              {step.status === SubmissionStatus.REJECTED &&
                submission.rejectionReason && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {submission.rejectionReason}
                  </p>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
