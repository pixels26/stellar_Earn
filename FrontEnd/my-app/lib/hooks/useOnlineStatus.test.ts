import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOnlineStatus } from './useOnlineStatus';
import { useStore } from '@/lib/store';

// Mock the store
vi.mock('@/lib/store', () => ({
  useStore: vi.fn(),
}));

describe('useOnlineStatus', () => {
  let setOnlineStatusMock: ReturnType<typeof vi.fn>;
  let clearRetryableErrorMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setOnlineStatusMock = vi.fn();
    clearRetryableErrorMock = vi.fn();

    (useStore as any).mockImplementation((selector: any) => {
      const state = {
        isOnline: navigator.onLine,
        hasRetryableError: false,
        retryFunction: null,
        setOnlineStatus: setOnlineStatusMock,
        clearRetryableError: clearRetryableErrorMock,
      };
      return selector(state);
    });

    // Mock window events
    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with current online status', () => {
    renderHook(() => useOnlineStatus());

    expect(setOnlineStatusMock).toHaveBeenCalledWith(navigator.onLine);
  });

  it('sets up online and offline event listeners', () => {
    renderHook(() => useOnlineStatus());

    expect(window.addEventListener).toHaveBeenCalledWith(
      'online',
      expect.any(Function)
    );
    expect(window.addEventListener).toHaveBeenCalledWith(
      'offline',
      expect.any(Function)
    );
  });

  it('removes event listeners on unmount', () => {
    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith(
      'online',
      expect.any(Function)
    );
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'offline',
      expect.any(Function)
    );
  });

  it('updates online status when online event fires', () => {
    renderHook(() => useOnlineStatus());

    act(() => {
      const event = new Event('online');
      window.dispatchEvent(event);
    });

    expect(setOnlineStatusMock).toHaveBeenCalledWith(true);
  });

  it('updates online status when offline event fires', () => {
    renderHook(() => useOnlineStatus());

    act(() => {
      const event = new Event('offline');
      window.dispatchEvent(event);
    });

    expect(setOnlineStatusMock).toHaveBeenCalledWith(false);
  });

  it('returns isOnline from store', () => {
    (useStore as any).mockImplementation((selector: any) => {
      const state = {
        isOnline: true,
        hasRetryableError: false,
        retryFunction: null,
        setOnlineStatus: setOnlineStatusMock,
        clearRetryableError: clearRetryableErrorMock,
      };
      return selector(state);
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(true);
  });

  it('returns hasRetryableError from store', () => {
    (useStore as any).mockImplementation((selector: any) => {
      const state = {
        isOnline: true,
        hasRetryableError: true,
        retryFunction: null,
        setOnlineStatus: setOnlineStatusMock,
        clearRetryableError: clearRetryableErrorMock,
      };
      return selector(state);
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.hasRetryableError).toBe(true);
  });

  it('provides retryFailedRequest function', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(typeof result.current.retryFailedRequest).toBe('function');
  });

  it('calls retryFunction when retryFailedRequest is called', async () => {
    const retryFunctionMock = vi.fn().mockResolvedValue(undefined);

    (useStore as any).mockImplementation((selector: any) => {
      const state = {
        isOnline: true,
        hasRetryableError: true,
        retryFunction: retryFunctionMock,
        setOnlineStatus: setOnlineStatusMock,
        clearRetryableError: clearRetryableErrorMock,
      };
      return selector(state);
    });

    const { result } = renderHook(() => useOnlineStatus());

    await act(async () => {
      await result.current.retryFailedRequest();
    });

    expect(retryFunctionMock).toHaveBeenCalled();
  });

  it('clears retry error on successful retry', async () => {
    const retryFunctionMock = vi.fn().mockResolvedValue(undefined);

    (useStore as any).mockImplementation((selector: any) => {
      const state = {
        isOnline: true,
        hasRetryableError: true,
        retryFunction: retryFunctionMock,
        setOnlineStatus: setOnlineStatusMock,
        clearRetryableError: clearRetryableErrorMock,
      };
      return selector(state);
    });

    const { result } = renderHook(() => useOnlineStatus());

    await act(async () => {
      await result.current.retryFailedRequest();
    });

    expect(clearRetryableErrorMock).toHaveBeenCalled();
  });

  it('does not clear error if retry function throws', async () => {
    const retryFunctionMock = vi
      .fn()
      .mockRejectedValue(new Error('Retry failed'));

    (useStore as any).mockImplementation((selector: any) => {
      const state = {
        isOnline: true,
        hasRetryableError: true,
        retryFunction: retryFunctionMock,
        setOnlineStatus: setOnlineStatusMock,
        clearRetryableError: clearRetryableErrorMock,
      };
      return selector(state);
    });

    const { result } = renderHook(() => useOnlineStatus());

    await act(async () => {
      await result.current.retryFailedRequest();
    });

    expect(clearRetryableErrorMock).not.toHaveBeenCalled();
  });
});
