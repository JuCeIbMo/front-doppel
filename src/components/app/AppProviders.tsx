"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toaster } from "sonner";
import { ApiError } from "@/lib/api-client";
import { signOut } from "@/lib/supabase";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [queryClient] = useState(() => {
    // The one place a 401 is handled: the session expired or was revoked, so it ends
    // and the Owner goes back to sign in. Any query or mutation lands here.
    const onError = (error: unknown) => {
      if (!(error instanceof ApiError && error.status === 401)) return;
      void signOut();
      router.replace("/connect");
    };
    return new QueryClient({
      queryCache: new QueryCache({ onError }),
      mutationCache: new MutationCache({ onError }),
      defaultOptions: {
        queries: {
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    });
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="bottom-right" richColors closeButton visibleToasts={3} />
    </QueryClientProvider>
  );
}
