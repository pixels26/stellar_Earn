import {
    Body,
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Post,
  } from '@nestjs/common';
  import { WebhookService, WebhookProcessResult } from './webhook.service';
  
  interface InboundWebhookBody {
    event: string;
    questId: string;
    submitterAddress: string;
    proof: Record<string, unknown>;
  }
  
  /**
   * WebhookController receives external webhook events (e.g. GitHub push,
   * form submission) and hands them to WebhookService for trace-linked
   * on-chain execution.
   *
   * The `X-Webhook-Delivery` header (or equivalent) is used as the canonical
   * webhook delivery ID so that retried deliveries are idempotent with respect
   * to trace creation.
   */
  @Controller('webhooks')
  export class WebhookController {
    constructor(private readonly webhookService: WebhookService) {}
  
    /**
     * POST /webhooks
     * Accepts an inbound webhook and triggers trace-linked on-chain execution.
     *
     * Response headers will include `X-Trace-ID` (injected by TraceInterceptor)
     * so the caller can immediately correlate this delivery with its trace.
     */
    @Post()
    @HttpCode(HttpStatus.ACCEPTED)
    async handleWebhook(
      @Headers('x-webhook-delivery') deliveryId: string | undefined,
      @Headers('x-github-delivery') githubDeliveryId: string | undefined,
      @Body() body: InboundWebhookBody,
    ): Promise<WebhookProcessResult> {
      // Prefer explicit delivery header; fall back to GitHub's header
      const resolvedDeliveryId =
        deliveryId ?? githubDeliveryId ?? `auto-${Date.now()}`;
  
      return this.webhookService.handleWebhook({
        deliveryId: resolvedDeliveryId,
        event: body.event,
        questId: body.questId,
        submitterAddress: body.submitterAddress,
        proof: body.proof,
      });
    }
  }