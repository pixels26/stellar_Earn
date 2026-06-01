import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuestStateReconciliationProcessor } from '../../src/modules/jobs/processors/quest-state-reconciliation.processor';
import { JobLogService } from '../../src/modules/jobs/services/job-log.service';
import { JobStatus } from '../../src/modules/jobs/job.types';
import { Quest } from '../../src/modules/quests/entities/quest.entity';
import { SorobanQuestReaderService } from '../../src/modules/stellar/soroban-quest-reader.service';

describe('QuestStateReconciliationProcessor', () => {
  let module: TestingModule;
  let processor: QuestStateReconciliationProcessor;
  let questRepository: any;
  let questReader: any;
  let jobLogService: any;

  beforeEach(async () => {
    questRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'q-1',
          contractTaskId: 'QUEST_1',
          creatorAddress: 'GCREATOR',
          rewardAsset: 'CREWARD',
          rewardAmount: 100,
          deadline: new Date('2030-01-01T00:00:00.000Z'),
          status: 'ACTIVE',
          currentCompletions: 0,
          updatedAt: new Date(),
        } as Partial<Quest>,
      ]),
    };

    questReader = {
      getQuest: jest.fn().mockResolvedValue({
        id: 'QUEST_1',
        creator: 'GCREATOR',
        reward_asset: 'CREWARD',
        reward_amount: BigInt(100),
        verifier: 'GVERIFY',
        deadline: BigInt(1893456000),
        status: 'Active',
        total_claims: 0,
      }),
    };

    jobLogService = {
      createJobLog: jest.fn().mockResolvedValue({ id: 'job-1' }),
      recordJobStart: jest.fn(),
      updateJobProgress: jest.fn(),
      updateJobLog: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        QuestStateReconciliationProcessor,
        { provide: getRepositoryToken(Quest), useValue: questRepository },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'CONTRACT_ID') return 'C_CONTRACT';
              if (key === 'QUEST_STATE_RECONCILIATION_ENABLED') return 'true';
              if (key === 'QUEST_STATE_RECONCILIATION_BATCH_SIZE') return '10';
              return undefined;
            }),
          },
        },
        { provide: JobLogService, useValue: jobLogService },
        { provide: SorobanQuestReaderService, useValue: questReader },
      ],
    }).compile();

    processor = module.get(QuestStateReconciliationProcessor);
  });

  afterEach(async () => {
    await module.close();
  });

  it('completes successfully when on-chain matches DB snapshot', async () => {
    await expect(processor.runReconciliation()).resolves.not.toThrow();
    expect(jobLogService.updateJobLog).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ status: JobStatus.COMPLETED }),
    );
  });

  it('records discrepancies when quest is missing on-chain', async () => {
    questReader.getQuest.mockResolvedValueOnce(null);
    await processor.runReconciliation();

    expect(jobLogService.updateJobLog).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({
        status: JobStatus.COMPLETED,
        result: expect.objectContaining({
          discrepanciesCount: 1,
        }),
      }),
    );
  });

  it('handles repository errors gracefully', async () => {
    questRepository.find.mockRejectedValueOnce(new Error('DB down'));
    await expect(processor.runReconciliation()).resolves.not.toThrow();
    expect(jobLogService.updateJobLog).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ status: JobStatus.FAILED }),
    );
  });
});

