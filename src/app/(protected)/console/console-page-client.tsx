"use client";

import { PlansGrid } from "@/components/console/plans-grid";
import { TransactionList } from "@/components/console/transaction-list";
import { WalletCard } from "@/components/console/wallet-card";
import { ConsoleHeader } from "@/components/layout/console-header";
import { bffPost } from "@/lib/bff-client";
import {
  BUNDLE_ORDER_STORAGE_KEY,
  COMMERCIAL_PLAN_ORDER_STORAGE_KEY,
  RECHARGE_ORDER_STORAGE_KEY,
} from "@/lib/bundle-constants";
import { parsePaymentReturn } from "@/lib/payment-callback";
import type { components } from "@/types/schemas-payment";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type WalletResponse = components["schemas"]["WalletResponse"];
type CommercialPlanOrderResponse =
  components["schemas"]["CommercialPlanOrderResponse"];
type ServiceBundleOrderResponse =
  components["schemas"]["ServiceBundleOrderResponse"];
type WalletRechargeResponse =
  components["schemas"]["WalletRechargeResponse"];

function isFailureStatus(status?: string): boolean {
  const normalized = status?.trim().toUpperCase();
  return (
    normalized === "FAILED" ||
    normalized === "CANCELLED" ||
    normalized === "CANCELED"
  );
}

export default function ConsolePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentReturn = parsePaymentReturn(searchParams.get("payment"));
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    const commercialPlanOrderId = sessionStorage.getItem(
      COMMERCIAL_PLAN_ORDER_STORAGE_KEY,
    );
    const bundleOrderId = sessionStorage.getItem(BUNDLE_ORDER_STORAGE_KEY);
    const rechargeOrderId = sessionStorage.getItem(RECHARGE_ORDER_STORAGE_KEY);
    const planOrderId = commercialPlanOrderId ?? bundleOrderId;

    if (
      !paymentReturn &&
      !commercialPlanOrderId &&
      !bundleOrderId &&
      !rechargeOrderId
    ) {
      return;
    }

    let cancelled = false;

    function clearPaymentQueryParam() {
      if (paymentReturn) {
        router.replace("/console", { scroll: false });
      }
    }

    function notifyPaymentReturnWithoutOrder() {
      if (!paymentReturn || planOrderId || rechargeOrderId) {
        return;
      }

      if (paymentReturn === "success") {
        toast.success("Retour paiement reçu. Mise à jour en cours…");
      } else if (paymentReturn === "cancelled") {
        toast.error("Paiement annulé.");
      } else {
        toast.error("Le paiement a échoué.");
      }

      handleRefresh();
    }

    async function refreshPendingOrders() {
      if (rechargeOrderId) {
        try {
          const order = await bffPost<WalletRechargeResponse>(
            `/api/payments/wallets/recharge-orders/${rechargeOrderId}/refresh`,
          );

          if (cancelled) return;

          sessionStorage.removeItem(RECHARGE_ORDER_STORAGE_KEY);

          if (order.status === "RECHARGED") {
            toast.success("Recharge confirmée. Votre wallet a été crédité.");
          } else if (isFailureStatus(order.status)) {
            toast.error(
              paymentReturn === "cancelled"
                ? "Recharge annulée."
                : "La recharge a échoué ou a été annulée.",
            );
          } else if (paymentReturn === "failure" || paymentReturn === "cancelled") {
            toast.error(
              paymentReturn === "cancelled"
                ? "Recharge annulée."
                : "La recharge a échoué.",
            );
          } else {
            toast.success("Paiement reçu. Traitement de la recharge en cours…");
          }

          handleRefresh();
        } catch (error) {
          if (!cancelled) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Impossible de confirmer la recharge",
            );
          }
        }
      }

      if (!planOrderId) {
        notifyPaymentReturnWithoutOrder();
        if (!cancelled) {
          clearPaymentQueryParam();
        }
        return;
      }

      try {
        if (commercialPlanOrderId) {
          const order = await bffPost<CommercialPlanOrderResponse>(
            `/api/commercial-plans/orders/${commercialPlanOrderId}/refresh`,
          );

          if (cancelled) return;

          sessionStorage.removeItem(COMMERCIAL_PLAN_ORDER_STORAGE_KEY);

          if (order.status === "ACTIVE") {
            toast.success("Paiement confirmé. Votre plan est activé.");
          } else if (isFailureStatus(order.status)) {
            toast.error(
              paymentReturn === "cancelled"
                ? "Paiement du plan annulé."
                : "Le paiement du plan a échoué ou a été annulé.",
            );
          } else if (paymentReturn === "failure" || paymentReturn === "cancelled") {
            toast.error(
              paymentReturn === "cancelled"
                ? "Paiement du plan annulé."
                : "Le paiement du plan a échoué.",
            );
          } else {
            toast.success("Paiement reçu. Traitement en cours…");
          }
        } else {
          const order = await bffPost<ServiceBundleOrderResponse>(
            `/api/service-bundles/orders/${planOrderId}/refresh`,
          );

          if (cancelled) return;

          sessionStorage.removeItem(BUNDLE_ORDER_STORAGE_KEY);

          if (order.status === "ACTIVE") {
            toast.success("Paiement confirmé. Vos services sont activés.");
          } else if (isFailureStatus(order.status)) {
            toast.error(
              paymentReturn === "cancelled"
                ? "Paiement du bundle annulé."
                : "Le paiement du bundle a échoué ou a été annulé.",
            );
          } else if (paymentReturn === "failure" || paymentReturn === "cancelled") {
            toast.error(
              paymentReturn === "cancelled"
                ? "Paiement du bundle annulé."
                : "Le paiement du bundle a échoué.",
            );
          } else {
            toast.success("Paiement reçu. Traitement en cours…");
          }
        }

        handleRefresh();
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Impossible de confirmer le paiement",
          );
        }
      } finally {
        if (!cancelled) {
          clearPaymentQueryParam();
        }
      }
    }

    void refreshPendingOrders();

    return () => {
      cancelled = true;
    };
  }, [paymentReturn, handleRefresh, router]);

  const dataKey = `${refreshKey}-${paymentReturn ?? "idle"}`;

  return (
    <div className="yypay:flex yypay:min-h-full yypay:flex-col yypay:bg-background">
      <ConsoleHeader
        title="Console"
        walletName={wallet?.ownerName}
        onCheckoutComplete={handleRefresh}
      />
      <main className="yypay:mx-auto yypay:w-full yypay:max-w-6xl yypay:flex-1 yypay:px-4 yypay:py-8 sm:yypay:px-6">
        <div className="yypay:mb-8">
          <h1 className="yypay:text-2xl yypay:font-bold yypay:text-foreground sm:yypay:text-3xl">
            Tableau de bord
          </h1>
          <p className="yypay:mt-2 yypay:text-muted-foreground">
            Gérez votre wallet, consultez vos transactions et souscrivez à des plans.
          </p>
        </div>

        <div
          key={dataKey}
          className="yypay:grid yypay:grid-cols-1 yypay:gap-6 lg:yypay:grid-cols-3"
        >
          <div className="yypay:lg:col-span-1">
            <WalletCard onWalletChange={setWallet} />
          </div>
          <div className="yypay:lg:col-span-2">
            <TransactionList
              walletId={wallet?.id}
              walletName={wallet?.ownerName}
            />
          </div>
        </div>

        <section className="yypay:mt-10">
          <h2 className="yypay:mb-4 yypay:text-xl yypay:font-semibold yypay:text-foreground">
            Plans disponibles
          </h2>
          <PlansGrid key={`plans-${dataKey}`} refreshKey={refreshKey} />
        </section>
      </main>
    </div>
  );
}
