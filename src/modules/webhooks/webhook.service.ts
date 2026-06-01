import { Injectable, Logger } from '@nestjs/common';
import { ExecutionTraceService } from '../../../BackEnd/src/modules/trace/execution-trace.service';
import { TraceIdUtil } from '../../../BackEnd/src/modules/trace/trace-id.util';
import {
  TraceContextStorage,
  TraceContext,
} from '../../../BackEnd/src/modules/trace/trace-context.storage';
import { TraceStatus } from '../../../BackEnd/src/modules/trace/trace.types';

export interface WebhookPayload {
  /** Unique delivery identifier provided by the source system (e.g. GitHub). */
  deliveryId: string;
  event: string;
  questId: string;
  submitterAddress: string;
  proof: Record<string, unknown>;
}

export interface WebhookProcessResult {
  traceId: string;
  accepted: boolean;
  message: string;
}

/**
 * WebhookService is the entry point for all inbound webhook events.
 *
 * Responsibility chain:
 *  1. Generate a trace ID (wh-<id>-oc-pending-ts-<ts>)
 *  2. Persist an initial PENDING trace record
 *  3. Run the rest of the pipeline inside AsyncLocalStorage so every
 *     downstream log line automatically carries the trace ID
 *  4. Invoke the Stellar execution layer (stubbed here) and link the
 *     resulting tx hash back into the trace
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly traceService: ExecutionTraceService) {}

  async handleWebhook(payload: WebhookPayload): Promise<WebhookProcessResult> {
    // 1. Generate trace ID at the earliest possible moment
    const traceId = TraceIdUtil.generate(payload.deliveryId);

    // 2. Build the trace context that will be propagated via AsyncLocalStorage
    const traceCtx: TraceContext = {
      traceId,
      webhookEventId: payload.deliveryId,
      questId: payload.questId,
      submitterId: payload.submitterAddress,
    };

    // 3. Run the entire processing pipeline inside the trace context
    return TraceContextStorage.run(traceCtx, async () => {
      this.logger.log(
        `[${traceId}] Webhook received: event=${payload.event} quest=${payload.questId}`,
      );

      // Persist the initial trace record
      await this.traceService.createTrace({
        traceId,
        webhookEventId: payload.deliveryId,
        questId: payload.questId,
        submitterAddress: payload.submitterAddress,
      });

      try {
        // 4. Execute on-chain logic (e.g. submit proof to Soroban contract)
        const txResult = await this.executeOnchain(traceId, payload);

        // 5. Link the on-chain tx hash back to the trace
        const linkedTrace = await this.traceService.linkOnchain({
          traceId,
          txHash: txResult.txHash,
          ledgerSequence: txResult.ledgerSequence,
          status: TraceStatus.SUBMITTED,
          message: `Proof submitted on-chain for quest ${payload.questId}.`,
          meta: { event: payload.event },
        });

        this.logger.log(
          `[${linkedTrace.traceId}] On-chain execution complete: tx=${txResult.txHash}`,
        );

        return {
          traceId: linkedTrace.traceId,
          accepted: true,
          message: 'Webhook processed and submitted on-chain.',
        };
      } catch (err) {
        // Append a FAILED event so the trace record reflects the error
        await this.traceService.appendEvent(
          traceId,
          TraceStatus.FAILED,
          `On-chain execution failed: ${(err as Error).message}`,
          { error: (err as Error).message },
        );

        this.logger.error(
          `[${traceId}] On-chain execution failed`,
          (err as Error).stack,
        );

        return {
          traceId,
          accepted: false,
          message: 'Webhook received but on-chain execution failed.',
        };
      }
    });
  }

  /**
   * Stub for the actual Stellar/Soroban contract invocation.
   * Replace with a real StellarClientService injection in production.
   */
  private async executeOnchain(
    traceId: string,
    payload: WebhookPayload,
  ): Promise<{ txHash: string; ledgerSequence: number }> {
    this.logger.log(`[${traceId}] Submitting proof on-chain…`);

    // Simulate async network call
    await new Promise((r) => setTimeout(r, 0));

    // Deterministic fake hash for testing; replace with real Stellar SDK call
    const mockTxHash =
      `${payload.questId}-${payload.deliveryId}`.replace(/[^a-zA-Z0-9]/g, '') +
      Date.now().toString(16);

    return { txHash: mockTxHash, ledgerSequence: 12345 };
  }
}