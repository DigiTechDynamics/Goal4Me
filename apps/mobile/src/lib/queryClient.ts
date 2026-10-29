import { QueryClient, type Query } from "@tanstack/react-query";

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

/** Storage key of the persisted query cache (also wiped on sign-out). */
export const QUERY_CACHE_KEY = "goal4me.query-cache";

/**
 * Query results are saved to device storage so the app (including the
 * day's workout) opens instantly and works offline. Bump `buster` whenever
 * a cached data shape changes, to discard old caches.
 *
 * Queries can opt out with `meta: { persist: false }`, e.g. progress photos,
 * whose signed URLs expire and must never outlive the session on disk.
 */
export const PERSIST_OPTIONS = {
  maxAge: 7 * 24 * 60 * 60 * 1000,
  buster: "v2",
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Query) =>
      query.state.status === "success" && query.meta?.persist !== false,
  },
};
