import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchQuests, PaginatedQuests } from '../api/quests';

/**
 * Custom hook for fetching quests with built-in prefetching logic.
 * @param page The current page number (1-indexed)
 * @param limit Number of items per page
 */
export const useQuests = (page: number, limit: number = 10) => {
  const queryClient = useQueryClient();

  // Main query for the current page
  const query = useQuery<PaginatedQuests>({
    queryKey: ['quests', { page, limit }],
    queryFn: () => fetchQuests(page, limit),
    // Keeps data from the previous page on screen while loading the new one
    placeholderData: (previousData) => previousData,
    staleTime: 5000,
  });

  const prefetchNextPage = useCallback(async () => {
    const nextPage = page + 1;
    
    // Avoid prefetching if we know there is no next page (if total is available)
    if (query.data && !query.data.hasNextPage) return;

    await queryClient.prefetchQuery({
      queryKey: ['quests', { page: nextPage, limit }],
      queryFn: () => fetchQuests(nextPage, limit),
      staleTime: 60 * 1000, // Consider prefetched data fresh for 1 minute
    });
  }, [page, limit, queryClient, query.data]);

  // Background prefetch whenever the page changes and we have data
  useEffect(() => {
    if (query.isSuccess && query.data?.hasNextPage) {
      prefetchNextPage();
    }
  }, [page, query.isSuccess, query.data?.hasNextPage, prefetchNextPage]);

  return {
    ...query,
    quests: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    hasNextPage: !!query.data?.hasNextPage,
    prefetchNextPage,
  };
};