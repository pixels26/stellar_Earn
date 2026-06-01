import { renderHook, waitFor } from '@testing-library/react';
import { useQuests } from './useQuests';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as api from '../api/quests';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../api/quests');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useQuests Pagination Prefetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('automatically prefetches page 2 when page 1 is loaded', async () => {
    const mockFetch = vi.mocked(api.fetchQuests).mockResolvedValue({
      items: [],
      total: 20,
      hasNextPage: true,
    });

    renderHook(() => useQuests(1, 10), { wrapper: createWrapper() });

    // Assert initial call for Page 1
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(1, 10);
    });

    // Assert background prefetch call for Page 2
    // The useEffect in the hook triggers this automatically
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(2, 10);
    });
    
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});