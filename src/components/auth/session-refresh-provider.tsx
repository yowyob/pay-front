"use client";

import { BffError, bffPost } from "@/lib/bff-client";
import { SESSION_REFRESH_INTERVAL_MS } from "@/lib/session-refresh";
import type { components } from "@/types/schemas-auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type RefreshTokenResponse = components["schemas"]["RefreshTokenResponse"];

type SessionRefreshProviderProps = {
  children: React.ReactNode;
};

export function SessionRefreshProvider({
  children,
}: SessionRefreshProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (pathname === "/tenants" || pathname === "/organizations") {
      return;
    }

    let cancelled = false;

    async function refreshSession() {
      if (refreshingRef.current || cancelled) {
        return;
      }

      refreshingRef.current = true;
      try {
        await bffPost<RefreshTokenResponse>("/api/auth/refresh");
      } catch (error) {
        if (
          error instanceof BffError &&
          (error.status === 401 || error.status === 403)
        ) {
          router.replace("/login");
        }
      } finally {
        refreshingRef.current = false;
      }
    }

    const intervalId = globalThis.setInterval(() => {
      void refreshSession();
    }, SESSION_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      globalThis.clearInterval(intervalId);
    };
  }, [pathname, router]);

  return children;
}
