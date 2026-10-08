"use client";

import * as React from "react";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toast } from "@heroui/react";
import { I18nProvider, RouterProvider } from "react-aria-components";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/store";
import { bootstrapSession } from "@/lib/auth/session";
import { LOCALE_TAG, LocaleProvider, useI18n } from "@/lib/i18n";
import { toastError } from "@/lib/feedback";
import type { ApiError } from "@/lib/api/errors";

/**
 * Client boundary: TanStack Query + one cold-start session re-hydration.
 * The zustand store is created server-safe (skipHydration); we pull the
 * persisted refresh token back on the client, then mint a fresh access token.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const navigate = React.useCallback((path: string) => router.push(path), [router]);
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: 0 },
        },
        mutationCache: new MutationCache({
          onError: (error, _variables, _result, mutation) => {
            if (mutation.meta?.silentError) return;
            toastError(error as ApiError);
          },
        }),
      }),
  );
  const [booted, setBooted] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    void (async () => {
      await useSession.persist?.rehydrate?.();
      await bootstrapSession();
      if (alive) setBooted(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <LocaleProvider>
      <ReactAriaLocale>
        <QueryClientProvider client={client}>
          {/* HeroUI v3 builds on React Aria; route its Link/Button hrefs through the Next router. */}
          <RouterProvider navigate={navigate}>
            <SessionReadyContext.Provider value={{ booted }}>{children}</SessionReadyContext.Provider>
            {/* HeroUI v3: Toast.Provider renders the toast region itself and is
                mounted as a sibling (self-closing) — NOT a wrapper around the tree.
                The imperative `toast()` in @/lib/feedback writes to its queue.
                width tightens HeroUI's 460px default (a min-width floor) so short
                toasts hug their text instead of stretching into an oversized box. */}
            <Toast.Provider placement="bottom end" width={320} />
          </RouterProvider>
        </QueryClientProvider>
      </ReactAriaLocale>
    </LocaleProvider>
  );
}

/**
 * Feeds our app locale into React-Aria's I18nProvider so HeroUI v3 components
 * (dates, numbers, RTL, screen-reader language) honor the en/zh choice — not
 * just our own dictionary. Must sit inside <LocaleProvider> to read useI18n().
 */
function ReactAriaLocale({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n();
  return <I18nProvider locale={LOCALE_TAG[locale]}>{children}</I18nProvider>;
}

export const SessionReadyContext = React.createContext<{ booted: boolean }>({ booted: false });
export const useSessionReady = () => React.useContext(SessionReadyContext).booted;
