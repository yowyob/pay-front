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
  /** Portefeuille de l'organisation active : celui qu'on recharge et qui paie ses achats. */
  wallet: WalletResponse | null;
  /** Portefeuille personnel du compte, distinct ; null s'il n'existe pas ou s'il est le même. */
  personalWallet: WalletResponse | null;
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
  const [personalWallet, setPersonalWallet] = useState<WalletResponse | null>(null);
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
      // Le wallet peut etre indexe sur l'actorId ou directement sur l'id du
      // compte selon la facon dont il a ete cree : on essaie les deux.
      const ownerCandidates = Array.from(
        new Set([ctx.actorId ?? me.actorId, me.id].filter(Boolean) as string[]),
      );
      let personal: WalletResponse | null = null;
      for (const ownerId of ownerCandidates) {
        try {
          personal = await bffGet<WalletResponse>(
            `/api/payments/wallets/owner/${ownerId}`,
          );
          if (personal) break;
        } catch {
          // owner suivant
        }
      }
      // Les achats d'une organisation (plans, packs) sont débités de SON portefeuille : c'est lui
      // que la console affiche et recharge. On montrait le portefeuille personnel, si bien qu'on
      // rechargeait un portefeuille et que l'achat en débitait un autre.
      let organizationWallet: WalletResponse | null = null;
      if (ctx.organizationId) {
        try {
          organizationWallet = await bffGet<WalletResponse>(
            `/api/payments/wallets/owner/${ctx.organizationId}`,
          );
        } catch {
          // Pas encore de portefeuille d'organisation : la carte du solde propose de le créer.
        }
      }
      if (ctx.organizationId) {
        setWallet(organizationWallet);
        setPersonalWallet(personal && personal.id !== organizationWallet?.id ? personal : null);
      } else {
        setWallet(personal);
        setPersonalWallet(null);
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
        personalWallet,
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
