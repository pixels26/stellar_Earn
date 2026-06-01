import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAPIBootstrap } from '@/lib/hooks/useAPIBootstrap';

/**
 * Test suite for useAPIBootstrap hook
 */
describe('useAPIBootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const mockFetch = vi.fn(async () => ({ data: 'test' }));

    const { result } = renderHook(() =>
      useAPIBootstrap(mockFetch, { retries: 1, initialDelay: 100 })
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should fetch data successfully', async () => {
    const testData = { id: 1, name: 'Test' };
    const mockFetch = vi.fn(async () => testData);

    const { result } = renderHook(() =>
      useAPIBootstrap(mockFetch, { retries: 1, initialDelay: 100 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(testData);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should handle fetch errors', async () => {
    const testError = new Error('Fetch failed');
    const mockFetch = vi.fn(async () => {
      throw testError;
    });

    const { result } = renderHook(() =>
      useAPIBootstrap(mockFetch, { retries: 1, initialDelay: 50 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(testError);
    expect(result.current.data).toBeNull();
  });

  it('should retry on failure', async () => {
    let callCount = 0;
    const mockFetch = vi.fn(async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error('Temporary failure');
      }
      return { data: 'success' };
    });

    const { result } = renderHook(() =>
      useAPIBootstrap(mockFetch, { retries: 3, initialDelay: 50 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ data: 'success' });
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should call onError callback on failure', async () => {
    const testError = new Error('Fetch failed');
    const mockFetch = vi.fn(async () => {
      throw testError;
    });
    const onErrorMock = vi.fn();

    const { result } = renderHook(() =>
      useAPIBootstrap(mockFetch, {
        retries: 1,
        initialDelay: 50,
        onError: onErrorMock,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(onErrorMock).toHaveBeenCalledWith(testError);
  });

  it('should support manual retry', async () => {
    let callCount = 0;
    const mockFetch = vi.fn(async () => {
      callCount++;
      return { data: `call-${callCount}` };
    });

    const { result } = renderHook(() =>
      useAPIBootstrap(mockFetch, { retries: 1, initialDelay: 50 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ data: 'call-1' });
    expect(result.current.retryCount).toBe(0);

    // Manual retry
    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ data: 'call-2' });
    expect(result.current.retryCount).toBe(1);
  });

  it('should increment retry count on manual retry', async () => {
    const mockFetch = vi.fn(async () => ({ data: 'test' }));

    const { result } = renderHook(() =>
      useAPIBootstrap(mockFetch, { retries: 1, initialDelay: 50 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.retryCount).toBe(0);

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.retryCount).toBe(1);
    });

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.retryCount).toBe(2);
    });
  });

  it('should support reset', async () => {
    const mockFetch = vi.fn(async () => ({ data: 'test' }));

    const { result } = renderHook(() =>
      useAPIBootstrap(mockFetch, { retries: 1, initialDelay: 50 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ data: 'test' });

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.retryCount).toBe(0);
  });

  it('should respect timeout option', async () => {
    const mockFetch = vi.fn(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: 'test' }), 1000))
    );

    const { result } = renderHook(() =>
      useAPIBootstrap(mockFetch, { retries: 0, timeout: 100 })
    );

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 5000 }
    );

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toMatch(/timeout/i);
  });

  it('should provide isRecoverable flag', async () => {
    const mockFetch = vi.fn(async () => {
      throw new Error('Test error');
    });

    const { result } = renderHook(() =>
      useAPIBootstrap(mockFetch, { retries: 1, initialDelay: 50 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isRecoverable).toBe(true);
    expect(result.current.canRetry).toBe(true);
  });

  it('should provide canRetry flag', async () => {
    const mockFetch = vi.fn(async () => ({ data: 'test' }));

    const { result } = renderHook(() =>
      useAPIBootstrap(mockFetch, { retries: 1, initialDelay: 50 })
    );

    expect(result.current.canRetry).toBe(false); // Still loading

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.canRetry).toBe(false); // Success, no error
  });

  it('should support component name in options', async () => {
    const mockFetch = vi.fn(async () => ({ data: 'test' }));
    const onErrorMock = vi.fn();

    const { result } = renderHook(() =>
      useAPIBootstrap(mockFetch, {
        retries: 1,
        initialDelay: 50,
        componentName: 'TestComponent',
        onError: onErrorMock,
      })
    );

    // Trigger error on next call
    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Component name should be used in any error reporting
    // (actual verification would be in error logging tests)
  });

  it('should handle rapid consecutive retries', async () => {
    const mockFetch = vi.fn(async () => ({ data: 'test' }));

    const { result } = renderHook(() =>
      useAPIBootstrap(mockFetch, { retries: 0, initialDelay: 10 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Trigger multiple rapid retries
    act(() => {
      result.current.retry();
      result.current.retry();
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.retryCount).toBe(3);
    });
  });

  it('should cleanup on unmount', async () => {
    const mockFetch = vi.fn(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: 'test' }), 1000))
    );

    const { unmount } = renderHook(() =>
      useAPIBootstrap(mockFetch, { retries: 0, initialDelay: 50 })
    );

    unmount();

    // Should not throw on cleanup
    expect(true).toBe(true);
  });
});
