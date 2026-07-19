import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppThemeProvider } from '@/core/theme/ThemeContext';
import { router } from './router';
import { AuthProvider } from '@/core/auth/AuthContext';
import ErrorBoundary from '@/core/components/ErrorBoundary/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </AppThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
