"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useState, type ReactNode } from "react";
import { DashboardNavProvider } from "@/components/dashboard/DashboardNavContext";
import { DashboardChrome } from "@/components/dashboard/DashboardChrome";

function DashboardChromeBoundary({ children }: { children: ReactNode }) {
  return (
    <DashboardNavProvider>
      <DashboardChrome>{children}</DashboardChrome>
    </DashboardNavProvider>
  );
}

export default function DashboardRouteLayout({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense
        fallback={
          <div className="flex h-dvh items-center justify-center bg-wt-bg text-sm text-wt-text-muted">
            Loading…
          </div>
        }
      >
        <DashboardChromeBoundary>{children}</DashboardChromeBoundary>
      </Suspense>
    </QueryClientProvider>
  );
}
