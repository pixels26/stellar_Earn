import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StellarService } from './stellar.service';
import { TracingService } from '../../common/tracing/tracing.service';
import { MetricsService } from '../../common/services/metrics.service';
import * as StellarSdk from '@stellar/stellar-sdk';

describe('StellarService (Security)', () => {
  let service: StellarService;
  let tracingService: TracingService;
  let metricsService: MetricsService;

  // Generate a valid test keypair for unit testing
  const adminKeypair = StellarSdk.Keypair.random();

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'STELLAR_ADMIN_SECRET') return adminKeypair.secret();
      if (key === 'STELLAR_NETWORK') return 'TESTNET';
      if (key === 'STELLAR_HORIZON_URL')
        return 'https://horizon-testnet.stellar.org';

      return null;
    }),
  };

  const mockSpan = {
    attributes: {} as Record<string, any>,
    status: 'ok',
  };

  const mockTracing = {
    trace: jest.fn().mockImplementation(async (name, fn, attrs) => {
      mockSpan.attributes = { ...attrs };
      mockSpan.status = 'ok';
      return fn(mockSpan);
    }),
  };

  const mockMetrics = {
    incrementCounter: jest.fn(),
    observeHistogram: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: TracingService, useValue: mockTracing },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
    tracingService = module.get<TracingService>(TracingService);
    metricsService = module.get<MetricsService>(MetricsService);
    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should sign a transaction using the secure config key and record success telemetry', async () => {
    const validPubKey = StellarSdk.Keypair.random().publicKey();

    const sourceAccount = new StellarSdk.Account(validPubKey, '1');

    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: service.getNetworkPassphrase(),
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: validPubKey,
          asset: StellarSdk.Asset.native(),
          amount: '1',
        }),
      )
      .setTimeout(30)
      .build();

    expect(tx.signatures.length).toBe(0);

    jest
      .spyOn((service as any).horizonServer, 'submitTransaction')
      .mockResolvedValue({ hash: '123', ledger: 42 });

    await service.signAndSubmit(tx);

    expect(tx.signatures.length).toBe(1);
    expect(mockConfig.get).toHaveBeenCalledWith('STELLAR_ADMIN_SECRET');

    // Verify tracing call
    expect(tracingService.trace).toHaveBeenCalledWith(
      'stellar.contract.submit',
      expect.any(Function),
      expect.objectContaining({
        'stellar.contract.id': 'unknown',
        'stellar.contract.function': 'unknown',
      })
    );

    // Verify trace attributes
    expect(mockSpan.attributes['stellar.tx.ledger']).toBe(42);
    expect(mockSpan.attributes['stellar.tx.status']).toBe('success');

    // Verify metrics calls
    expect(metricsService.incrementCounter).toHaveBeenCalledWith(
      'stellar_contract_invocations_total',
      { contract_id: 'unknown', function: 'unknown' }
    );
    
    expect(metricsService.observeHistogram).toHaveBeenCalledWith(
      'stellar_contract_invocation_duration_ms',
      expect.any(Number),
      { contract_id: 'unknown', function: 'unknown', status: 'success' }
    );
  });

  it('should handle submission failure and record failure telemetry', async () => {
    const validPubKey = StellarSdk.Keypair.random().publicKey();
    const sourceAccount = new StellarSdk.Account(validPubKey, '1');
    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: service.getNetworkPassphrase(),
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: validPubKey,
          asset: StellarSdk.Asset.native(),
          amount: '1',
        }),
      )
      .setTimeout(30)
      .build();

    jest
      .spyOn((service as any).horizonServer, 'submitTransaction')
      .mockRejectedValue(new Error('Horizon rate limit exceeded'));

    await expect(service.signAndSubmit(tx)).rejects.toThrow('Transaction signing security failure');

    // Verify trace attributes marked as error
    expect(mockSpan.status).toBe('error');
    expect(mockSpan.attributes['error.message']).toBe('Horizon rate limit exceeded');
    expect(mockSpan.attributes['error.type']).toBe('Error');

    // Verify metrics tracked failure
    expect(metricsService.incrementCounter).toHaveBeenCalledWith(
      'stellar_contract_invocation_failures_total',
      { contract_id: 'unknown', function: 'unknown', error_type: 'submission_error' }
    );
  });
});