import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { nativeToScVal, StrKey } from '@stellar/stellar-sdk';
import { randomBytes } from 'crypto';
import { SorobanQuestReaderService } from '../../src/modules/stellar/soroban-quest-reader.service';

describe('SorobanQuestReaderService (integration)', () => {
  let module: TestingModule;
  let service: SorobanQuestReaderService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        SorobanQuestReaderService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SOROBAN_RPC_URL') return 'https://soroban-testnet.stellar.org';
              if (key === 'STELLAR_NETWORK') return 'TESTNET';
              if (key === 'SOROBAN_SIM_SOURCE_ACCOUNT')
                return 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(SorobanQuestReaderService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('decodes quest state from simulated contract return value', async () => {
    // Patch the underlying rpc server call to avoid network usage.
    const rpcServer = (service as any).rpcServer;
    jest.spyOn(rpcServer, 'simulateTransaction').mockResolvedValue({
      transactionData: 'AAAA',
      result: {
        retval: nativeToScVal({
          id: 'QUEST_1',
          creator: 'GCREATOR',
          reward_asset: 'CREWARD',
          reward_amount: 100n,
          verifier: 'GVERIFY',
          deadline: 1893456000n,
          status: 'Active',
          total_claims: 7,
        }),
      },
    });

    const contractId = StrKey.encodeContract(randomBytes(32));
    const quest = await service.getQuest(contractId, 'QUEST_1');
    expect(quest).toEqual({
      id: 'QUEST_1',
      creator: 'GCREATOR',
      reward_asset: 'CREWARD',
      reward_amount: 100n,
      verifier: 'GVERIFY',
      deadline: 1893456000n,
      status: 'Active',
      total_claims: 7,
    });
  });
});
