"use client";

import { bffGet } from "@/lib/bff-client";
import type { components } from "@/types/schemas-auth";
import type { components as PaymentComponents } from "@/types/schemas-payment";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

type UserAccountResponse = components["schemas"]["UserAccountResponse"];
type WalletResponse = PaymentComponents["schemas"]["WalletResponse"];
type SessionContext = {
  organizationId: string | null;
  actorId: string | null;
  walletId: string | null;
};

type ConsoleData = {
  user: UserAccountResponse | null;
  sessionContext: SessionContext | null;
  wallet: WalletResponse | null;
  walletLoading: boolean;
  setWallet: (wallet: WalletResponse | null) => void;
  refreshWallet: () => Promise<void>;
  refreshKey: number;
  bumpRefresh: () => void;
};

const ConsoleDataContext = createContext<ConsoleData | null>(null);

export function ConsoleDataProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserAccountResponse | null>(null);
  const [sessionContext, setSessionContext] = useState<SessionContext | null>(
    null,
  );
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshWallet = useCallback(async () => {
    setWalletLoading(true);
    try {
      const [me, ctx] = await Promise.all([
        bffGet<UserAccountResponse>("/api/session/me"),
        bffGet<SessionContext>("/api/session/context"),
      ]);
      setUser(me);
      setSessionContext(ctx);
      const actorId = ctx.actorId ?? me.actorId;
      if (!actorId) {
        setWallet(null);
        return;
      }
      try {
        const walletData = await bffGet<WalletResponse>(
          `/api/payments/wallets/owner/${actorId}`,
        );
        setWallet(walletData);
      } catch {
        setWallet(null);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible de charger le wallet",
      );
    } finally {
      setWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      void refreshWallet();
    }, 0);
    return () => globalThis.clearTimeout(timer);
  }, [refreshWallet]);

  const bumpRefresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
    void refreshWallet();
  }, [refreshWallet]);

  return (
    <ConsoleDataContext.Provider
      value={{
        user,
        sessionContext,
        wallet,
        walletLoading,
        setWallet,
        refreshWallet,
        refreshKey,
        bumpRefresh,
      }}
    >
      {children}
    </ConsoleDataContext.Provider>
  );
}

export function useConsoleData() {
  const ctx = useContext(ConsoleDataContext);
  if (!ctx) {
    throw new Error("useConsoleData must be used within a ConsoleDataProvider");
  }
  return ctx;
}
