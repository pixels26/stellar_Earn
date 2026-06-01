## Summary

This PR introduces a production-grade background job processing system using BullMQ + Redis.

## What I changed

- Added `JobsModule` with `JobsService` that creates and manages BullMQ queues and workers.
- Implemented queue processors for: notifications, analytics aggregation, data cleanup, and scheduled/cron jobs.
- Added retry/exponential backoff and dead-letter queue handling.
- Added `JobsController` to enqueue jobs at `POST /api/1/jobs/:queue`.
- Integrated Bull Board for monitoring; available at `/admin/queues` when enabled.
- Added unit tests (including repository mocks) and updated test scaffolding to avoid Redis dependency.
- Registered `JobsModule` in `AppModule` and mounted Bull Board in `main.ts` when available.

## How to run locally

1. Start Redis (or set `REDIS_URL` to a reachable Redis instance).
2. From `BackEnd` folder install packages:

```bash
npm install @nestjs/bullmq bullmq ioredis @bull-board/api @bull-board/express
npm install
```

3. Build and start the API

```bash
cd BackEnd
npm run build
npm start
```

4. Open Bull Board at `http://localhost:3001/admin/queues` (if mounted).

## Notes & Next Steps

- Consider wiring processors to actual services (`NotificationsModule`, `AnalyticsModule`) via DI.
- Add integration tests that run against a disposable Redis instance (Docker).
- Add authentication/ACL for Bull Board in production.
