import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Profile and plan data change rarely; avoid refetching on every focus.
      staleTime: 60_000,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: { retry: 0 },
  },
});

/**
 * Query results are saved to device storage so the app (including the
 * day's workout) opens instantly and works offline. Bump `buster` whenever
 * a cached data shape changes, to discard old caches.
 */
export const PERSIST_OPTIONS = {
  maxAge: 7 * 24 * 60 * 60 * 1000,
  buster: "v1",
} as const;
