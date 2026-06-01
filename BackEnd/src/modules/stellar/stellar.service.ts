import { Injectable, Logger, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';
import { TracingService } from '../../common/tracing/tracing.service';
import { MetricsService } from '../../common/services/metrics.service';

@Injectable()
export class StellarService implements OnModuleInit {
  private readonly logger = new Logger(StellarService.name);
  private horizonServer: StellarSdk.Horizon.Server;
  private networkPassphrase: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly tracing: TracingService,
    private readonly metrics: MetricsService,
  ) {}

  onModuleInit() {
    this.initializeStellarComponents();
  }

  private initializeStellarComponents() {
    const horizonUrl = this.configService.get<string>('STELLAR_HORIZON_URL') || 'https://horizon-testnet.stellar.org';
    const network = this.configService.get<string>('STELLAR_NETWORK');

    this.horizonServer = new StellarSdk.Horizon.Server(horizonUrl);
    this.networkPassphrase = network === 'PUBLIC' ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET;
    
    this.logger.log(`Stellar Service initialized on ${network}`);
  }

  async signAndSubmit(transaction: StellarSdk.Transaction): Promise<any> {
    const secretKey = this.configService.get<string>('STELLAR_ADMIN_SECRET');

    if (!secretKey) {
      throw new InternalServerErrorException('Stellar admin secret is not configured in .env');
    }

    let contractId = 'unknown';
    let functionName = 'unknown';

    if (transaction.operations && transaction.operations.length > 0) {
      const op = transaction.operations[0] as any;
      if (op.type === 'invokeContractFunction' || op.type === 'invoke_contract_function') {
        contractId = op.contract || 'unknown';
        functionName = op.function || 'unknown';
      }
    }

    return this.tracing.trace(
      'stellar.contract.submit',
      async (span) => {
        span.attributes['stellar.contract.id'] = contractId;
        span.attributes['stellar.contract.function'] = functionName;
        span.attributes['stellar.tx.hash'] = transaction.hash().toString('hex');

        this.metrics.incrementCounter('stellar_contract_invocations_total', {
          contract_id: contractId,
          function: functionName,
        });

        const startTime = Date.now();

        try {
          const signer = StellarSdk.Keypair.fromSecret(secretKey);
          transaction.sign(signer);
          
          const result = await this.horizonServer.submitTransaction(transaction);
          
          const duration = Date.now() - startTime;
          this.metrics.observeHistogram('stellar_contract_invocation_duration_ms', duration, {
            contract_id: contractId,
            function: functionName,
            status: 'success',
          });

          span.attributes['stellar.tx.ledger'] = result.ledger;
          span.attributes['stellar.tx.status'] = 'success';

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          this.metrics.observeHistogram('stellar_contract_invocation_duration_ms', duration, {
            contract_id: contractId,
            function: functionName,
            status: 'failure',
          });

          const errorMsg = error instanceof Error ? error.message : String(error);
          this.logger.error(`Signing or submission failed: ${errorMsg}`, error instanceof Error ? error.stack : undefined);
          
          // Record failure in tracing span
          span.status = 'error';
          span.attributes['error.message'] = errorMsg;
          span.attributes['error.type'] = error instanceof Error ? error.name : 'SigningOrSubmissionError';

          // Record failure in metrics
          this.metrics.incrementCounter('stellar_contract_invocation_failures_total', {
            contract_id: contractId,
            function: functionName,
            error_type: 'submission_error',
          });

          throw new InternalServerErrorException(`Transaction signing security failure: ${errorMsg}`);
        }
      },
      {
        'stellar.contract.id': contractId,
        'stellar.contract.function': functionName,
      }
    );
  }

  getNetworkPassphrase(): string {
    return this.networkPassphrase;
  }
}