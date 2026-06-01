# FE-042 Quest Listing Cache

Quest listings use a stale-while-revalidate cache in `lib/api/quests.ts`.

- Fresh window: 3 minutes.
- Stale window: 10 additional minutes.
- Fresh entries return without a network request.
- Stale entries return immediately and trigger a background refresh.
- Components can pass `onRevalidate` to receive fresh data after the background request completes.
- Expired entries outside the stale window block on a fresh network request.

Quest create/update/delete operations continue to invalidate quest caches through the shared cache manager.
