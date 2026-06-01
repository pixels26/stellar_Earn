import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JobLogService } from '../services/job-log.service';
import { JobStatus, JobType } from '../job.types';
import { Quest } from '../../quests/entities/quest.entity';
import {
  OnChainQuestState,
  SorobanQuestReaderService,
} from '../../stellar/soroban-quest-reader.service';

type QuestDiscrepancy =
  | {
      questId: string;
      contractTaskId: string;
      type: 'missing_on_chain';
    }
  | {
      questId: string;
      contractTaskId: string;
      type: 'field_mismatch';
      field: string;
      dbValue: unknown;
      onChainValue: unknown;
    };

/**
 * Quest State Reconciliation Processor
 * SC-076 / Issue #1546: Compare on-chain quest state vs backend DB snapshot.
 *
 * Notes:
 * - This is a read-only reconciliation job; it does not mutate on-chain state.
 * - It also avoids auto-healing DB state by default; it logs discrepancies for review.
 */
@Injectable()
export class QuestStateReconciliationProcessor {
  private readonly logger = new Logger(QuestStateReconciliationProcessor.name);

  constructor(
    @InjectRepository(Quest)
    private readonly questRepository: Repository<Quest>,
    private readonly configService: ConfigService,
    private readonly jobLogService: JobLogService,
    private readonly questReader: SorobanQuestReaderService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async runReconciliation(): Promise<void> {
    const contractId = this.configService.get<string>('CONTRACT_ID') || '';
    const enabled =
      (this.configService.get<string>('QUEST_STATE_RECONCILIATION_ENABLED') || 'true').toLowerCase() !==
      'false';
    const batchSize = Number(
      this.configService.get<string>('QUEST_STATE_RECONCILIATION_BATCH_SIZE') || '100',
    );

    if (!enabled) return;

    const jobLog = await this.jobLogService.createJobLog({
      jobType: JobType.QUEST_STATE_RECONCILE,
      status: JobStatus.PENDING,
      queueName: 'cron',
      payload: { contractId, batchSize },
      tags: ['reconciliation', 'quest', 'onchain', 'offchain'],
    });

    await this.jobLogService.recordJobStart(jobLog.id, 'cron');

    const startedAt = Date.now();
    const discrepancies: QuestDiscrepancy[] = [];

    try {
      if (!contractId) {
        throw new Error('Missing CONTRACT_ID env var for quest reconciliation');
      }

      this.logger.log('Starting quest state reconciliation job');

      const quests = await this.questRepository.find({
        take: batchSize,
        order: { updatedAt: 'DESC' as any },
      });

      const candidates = quests.filter((q) => q.contractTaskId);
      if (candidates.length === 0) {
        this.logger.log('Quest reconciliation: no quests with contractTaskId found');
      }

      let processed = 0;
      for (const quest of candidates) {
        processed += 1;
        if (processed % 10 === 0) {
          await this.jobLogService.updateJobProgress(
            jobLog.id,
            Math.min(99, Math.floor((processed / candidates.length) * 100)),
            `Processed ${processed}/${candidates.length}`,
          );
        }

        const onChain = await this.questReader.getQuest(contractId, quest.contractTaskId);
        if (!onChain) {
          discrepancies.push({
            questId: quest.id,
            contractTaskId: quest.contractTaskId,
            type: 'missing_on_chain',
          });
          continue;
        }

        // Compare fields we can map reliably between DB row and on-chain struct.
        this.compareField(discrepancies, quest, onChain, 'creatorAddress', 'creator');
        this.compareField(discrepancies, quest, onChain, 'rewardAsset', 'reward_asset');

        // rewardAmount is number in DB; compare as BigInt to avoid float edge cases.
        if (quest.rewardAmount !== undefined && quest.rewardAmount !== null) {
          const dbReward = BigInt(quest.rewardAmount);
          if (dbReward !== onChain.reward_amount) {
            discrepancies.push({
              questId: quest.id,
              contractTaskId: quest.contractTaskId,
              type: 'field_mismatch',
              field: 'rewardAmount',
              dbValue: dbReward.toString(),
              onChainValue: onChain.reward_amount.toString(),
            });
          }
        }

        if (quest.deadline) {
          const dbDeadlineSeconds = BigInt(Math.floor(new Date(quest.deadline).getTime() / 1000));
          if (dbDeadlineSeconds !== onChain.deadline) {
            discrepancies.push({
              questId: quest.id,
              contractTaskId: quest.contractTaskId,
              type: 'field_mismatch',
              field: 'deadline',
              dbValue: dbDeadlineSeconds.toString(),
              onChainValue: onChain.deadline.toString(),
            });
          }
        }

        // Status mapping: DB is typically 'ACTIVE'/'COMPLETED'/... while on-chain is TitleCase.
        const dbStatus = (quest.status || '').toString().toUpperCase();
        const expectedOnChain = this.mapDbStatusToOnChain(dbStatus);
        if (expectedOnChain && expectedOnChain !== onChain.status) {
          discrepancies.push({
            questId: quest.id,
            contractTaskId: quest.contractTaskId,
            type: 'field_mismatch',
            field: 'status',
            dbValue: dbStatus,
            onChainValue: onChain.status,
          });
        }

        // currentCompletions is our best-effort mirror for total_claims.
        if (
          quest.currentCompletions !== undefined &&
          quest.currentCompletions !== null &&
          Number(quest.currentCompletions) !== onChain.total_claims
        ) {
          discrepancies.push({
            questId: quest.id,
            contractTaskId: quest.contractTaskId,
            type: 'field_mismatch',
            field: 'currentCompletions',
            dbValue: Number(quest.currentCompletions),
            onChainValue: onChain.total_claims,
          });
        }
      }

      if (discrepancies.length > 0) {
        this.logger.warn(
          `Quest reconciliation complete — ${discrepancies.length} discrepancies found`,
        );
        for (const d of discrepancies.slice(0, 50)) {
          this.logger.warn(`[QuestReconcile] ${JSON.stringify(d)}`);
        }
      } else {
        this.logger.log(
          `Quest reconciliation complete — ${candidates.length} quests consistent`,
        );
      }

      await this.jobLogService.updateJobLog(jobLog.id, {
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
        result: {
          checked: candidates.length,
          discrepanciesCount: discrepancies.length,
          discrepancies,
        },
        durationMs: Date.now() - startedAt,
        progress: 100,
        progressMessage: `Done (${discrepancies.length} discrepancies)`,
      });
    } catch (error) {
      this.logger.error(`Quest reconciliation job failed: ${error.message}`, error.stack);
      await this.jobLogService.updateJobLog(jobLog.id, {
        status: JobStatus.FAILED,
        completedAt: new Date(),
        errorMessage: error.message,
        errorStack: error.stack,
        durationMs: Date.now() - startedAt,
      });
    }
  }

  private compareField(
    discrepancies: QuestDiscrepancy[],
    quest: Quest,
    onChain: OnChainQuestState,
    dbField: keyof Quest,
    onChainField: keyof OnChainQuestState,
  ) {
    const dbValue = (quest as any)[dbField];
    if (dbValue === undefined || dbValue === null) return;
    if (String(dbValue) !== String(onChain[onChainField])) {
      discrepancies.push({
        questId: quest.id,
        contractTaskId: quest.contractTaskId,
        type: 'field_mismatch',
        field: String(dbField),
        dbValue,
        onChainValue: onChain[onChainField],
      });
    }
  }

  private mapDbStatusToOnChain(
    dbStatusUpper: string,
  ): OnChainQuestState['status'] | null {
    // (typed as any-ish above) We keep mapping logic minimal and tolerant.
    switch (dbStatusUpper) {
      case 'ACTIVE':
        return 'Active';
      case 'PAUSED':
        return 'Paused';
      case 'COMPLETED':
        return 'Completed';
      case 'EXPIRED':
        return 'Expired';
      case 'CANCELLED':
      case 'CANCELED':
        return 'Cancelled';
      default:
        return null;
    }
  }
}
