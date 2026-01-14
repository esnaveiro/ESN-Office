import {QueryClient} from '@tanstack/react-query'

// Create a query client with optimized defaults
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Cache data for 30 seconds before considering it stale
            staleTime: 30000,
            // Keep unused data in cache for 5 minutes
            gcTime: 300000,
            // Don't refetch on window focus (since we have real-time subscriptions)
            refetchOnWindowFocus: false,
            // Don't refetch on reconnect (real-time subscriptions handle this)
            refetchOnReconnect: false,
            // Retry failed requests once
            retry: 1,
            // Retry delay
            retryDelay: 1000,
        },
    },
})
