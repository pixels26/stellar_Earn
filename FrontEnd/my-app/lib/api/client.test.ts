import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { tokenManager, apiClient } from './client';
import { http, HttpResponse } from 'msw';
import { server } from '@/tests/mocks/server';

const REFRESH_TOKEN_KEY = 'stellar_earn_refresh_token';
const ACCESS_TOKEN_KEY = 'stellar_earn_access_token';

function setValidTokens() {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, 'header.payload.signature');
  window.localStorage.setItem(REFRESH_TOKEN_KEY, 'header.payload.signature');
}

describe('tokenManager', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns null when no token exists', () => {
    expect(tokenManager.getAccessToken()).toBeNull();
  });

  it('returns valid JWT token when present', () => {
    const validToken = 'header.payload.signature';
    window.localStorage.setItem(ACCESS_TOKEN_KEY, validToken);
    expect(tokenManager.getAccessToken()).toBe(validToken);
  });

  it('removes invalid JWT token and returns null', () => {
    const invalidToken = 'invalid';
    window.localStorage.setItem(ACCESS_TOKEN_KEY, invalidToken);
    expect(tokenManager.getAccessToken()).toBeNull();
    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
  });

  it('handles localStorage error gracefully', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('error');
    });
    const result = tokenManager.getAccessToken();
    expect(result).toBeNull();
  });
});

describe('response interceptor - refresh failure', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('clears tokens when refresh fails after a 401 response', async () => {
    setValidTokens();

    server.use(
      http.get('http://localhost:3000/api/v1/auth/profile', () => {
        return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }),
      http.post('http://localhost:3000/api/v1/auth/refresh', () => {
        return HttpResponse.json({ message: 'Refresh failed' }, { status: 401 });
      })
    );

    try {
      await apiClient.get('/auth/profile');
    } catch {
      // expected
    }

    expect(tokenManager.getAccessToken()).toBeNull();
    expect(tokenManager.getRefreshToken()).toBeNull();
  });

  it('dispatches session-expired event when refresh fails', async () => {
    setValidTokens();

    const eventSpy = vi.fn();
    window.addEventListener('session-expired', eventSpy);

    server.use(
      http.get('http://localhost:3000/api/v1/auth/profile', () => {
        return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }),
      http.post('http://localhost:3000/api/v1/auth/refresh', () => {
        return HttpResponse.json({ message: 'Refresh failed' }, { status: 401 });
      })
    );

    try {
      await apiClient.get('/auth/profile');
    } catch {
      // expected
    }

    expect(eventSpy).toHaveBeenCalledTimes(1);
    const event = eventSpy.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ reason: 'token_refresh_failed' });

    window.removeEventListener('session-expired', eventSpy);
  });
});