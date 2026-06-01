# Session Expired UX Flow

When the JWT refresh token expires or becomes invalid, API requests return 401. The Axios interceptor attempts a transparent refresh, but when that also fails, the user needs clear feedback and a path to re-authenticate.

---

## Architecture

```
Axios interceptor (401 response → refresh fails)
  ├── clearTokens()                    ← removes stale tokens from localStorage
  ├── dispatchEvent('session-expired') ← bridges HTTP layer → React tree
  └── Promise.reject(refreshError)     ← callers still handle errors normally

SessionManager (listens for 'session-expired' event on window)
  ├── shows modal: "Session Expired"
  ├── "Connect Wallet" → logout() + open wallet connection modal
  └── "Dismiss" → logout()
```

The HTTP interceptor lives outside React, so a DOM `CustomEvent` (`session-expired`) is used to bridge into the component tree. The `SessionManager` component, already mounted globally in the root layout, listens for this event and shows a modal.

---

## Flow

1. A 401 response is received by the Axios response interceptor
2. The interceptor tries `POST /auth/refresh` with the stored refresh token
3. If refresh succeeds → queued requests are retried with the new token
4. If refresh fails:
   - `tokenManager.clearTokens()` removes both tokens from `localStorage`
   - `window.dispatchEvent(new CustomEvent('session-expired', ...))` fires
   - The failed request is rejected (callers handle normally)
5. `SessionManager` receives the event and shows a modal:
   - **"Session Expired"** title with explanation text
   - **"Connect Wallet"** button → calls `logout()` then opens `WalletConnectionModal`
   - **"Dismiss"** button → calls `logout()` without opening the wallet modal

---

## Key Files

| File | Role |
|------|------|
| `lib/api/client.ts` | Axios instance, token manager, response interceptor — refresh failure handling at lines 266-273 |
| `components/auth/SessionManager.tsx` | Event listener + session-expired modal UI |
| `components/auth/SessionManager.test.tsx` | Unit tests for the session-expired flow |
| `lib/api/client.test.ts` | Unit tests for interceptor refresh-failure behavior (token clearing + event dispatch) |
| `tests/e2e/auth.spec.ts` | E2E test for the session-expired modal appearance |

---

## Event Contract

```typescript
// Dispatched by client.ts when token refresh fails
window.dispatchEvent(
  new CustomEvent('session-expired', {
    detail: { reason: 'token_refresh_failed' },
  })
);
```

Any component can listen for this event on `window` if needed.

---

## Design Decisions

- **CustomEvent pattern** (not Zustand/Context): The Axios interceptor runs outside the React tree; dispatching a DOM event is the cleanest bridge.
- **Tokens cleared in the interceptor**: Prevents stale tokens from being used in subsequent requests before React re-renders.
- **Separate `isSessionExpired` state**: Distinguishes this modal from the proactive "Session Expiring" warning modal (which shares the same component but has different copy and buttons).
