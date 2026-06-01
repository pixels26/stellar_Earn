feat(jobs): add JobsModule with BullMQ workers and Bull Board

Add a production-ready background job processing system:
- `JobsModule` with `JobsService` managing BullMQ queues and workers
- Queues: notifications, analytics, cleanup, scheduled, dead-letter
- Exponential backoff, DLQ, progress updates, and worker lifecycle handling
- `JobsController` to enqueue jobs via HTTP POST `/api/1/jobs/:queue`
- Bull Board mounted at `/admin/queues` for monitoring (optional, requires packages)
- Minimal unit tests and test mocks for Notifications repository

Notes:
- Redis is required (set `REDIS_URL`, defaults to `redis://127.0.0.1:6379`).
- Install runtime deps: `npm install @nestjs/bullmq bullmq ioredis @bull-board/api @bull-board/express`y
