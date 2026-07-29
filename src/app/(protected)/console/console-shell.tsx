"use client";

import {
  ConsoleDataProvider,
  useConsoleData,
} from "@/components/console/console-data-provider";
import { ConsoleHeader } from "@/components/layout/console-header";
import { ConsoleSidebar } from "@/components/layout/console-sidebar";
import {
  OnboardingProvider,
  useOnboarding,
} from "@/components/onboarding/onboarding-tour";
import { useLocale } from "@/i18n/locale-provider";
import { bffPost } from "@/lib/bff-client";
import {
  BUNDLE_ORDER_STORAGE_KEY,
  COMMERCIAL_PLAN_ORDER_STORAGE_KEY,
  RECHARGE_ORDER_STORAGE_KEY,
} from "@/lib/bundle-constants";
import { parsePaymentReturn } from "@/lib/payment-callback";
import type { components } from "@/types/schemas-payment";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";

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

function PaymentReturnHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentReturn = parsePaymentReturn(searchParams.get("payment"));
  const { bumpRefresh } = useConsoleData();
  const { t } = useLocale();
  const pr = t.paymentReturn;

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
        toast.success(pr.genericSuccess);
      } else if (paymentReturn === "cancelled") {
        toast.error(pr.genericCancelled);
      } else {
        toast.error(pr.genericFailed);
      }

      bumpRefresh();
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
            toast.success(pr.rechargeConfirmed);
          } else if (isFailureStatus(order.status)) {
            toast.error(
              paymentReturn === "cancelled"
                ? pr.rechargeCancelled
                : pr.rechargeFailedOrCancelled,
            );
          } else if (paymentReturn === "failure" || paymentReturn === "cancelled") {
            toast.error(
              paymentReturn === "cancelled"
                ? pr.rechargeCancelled
                : pr.rechargeFailed,
            );
          } else {
            toast.success(pr.rechargeProcessing);
          }

          bumpRefresh();
        } catch (error) {
          if (!cancelled) {
            toast.error(
              error instanceof Error ? error.message : pr.rechargeConfirmError,
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
            toast.success(pr.planActivated);
          } else if (isFailureStatus(order.status)) {
            toast.error(
              paymentReturn === "cancelled"
                ? pr.planCancelled
                : pr.planFailedOrCancelled,
            );
          } else if (paymentReturn === "failure" || paymentReturn === "cancelled") {
            toast.error(
              paymentReturn === "cancelled" ? pr.planCancelled : pr.planFailed,
            );
          } else {
            toast.success(pr.processing);
          }
        } else {
          const order = await bffPost<ServiceBundleOrderResponse>(
            `/api/service-bundles/orders/${planOrderId}/refresh`,
          );

          if (cancelled) return;

          sessionStorage.removeItem(BUNDLE_ORDER_STORAGE_KEY);

          if (order.status === "ACTIVE") {
            toast.success(pr.bundleActivated);
          } else if (isFailureStatus(order.status)) {
            toast.error(
              paymentReturn === "cancelled"
                ? pr.bundleCancelled
                : pr.bundleFailedOrCancelled,
            );
          } else if (paymentReturn === "failure" || paymentReturn === "cancelled") {
            toast.error(
              paymentReturn === "cancelled" ? pr.bundleCancelled : pr.bundleFailed,
            );
          } else {
            toast.success(pr.processing);
          }
        }

        bumpRefresh();
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : pr.confirmError);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentReturn, bumpRefresh, router]);

  return null;
}

function ConsoleChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { wallet, bumpRefresh } = useConsoleData();
  const { restart } = useOnboarding();
  const { t } = useLocale();
  const pageTitles: Record<string, string> = {
    "/console": t.sidebar.overview,
    "/console/transactions": t.sidebar.transactions,
    "/console/plans": t.sidebar.plans,
  };
  const title = pageTitles[pathname] ?? "Console";

  return (
    <div className="yypay:flex yypay:min-h-full yypay:flex-col yypay:bg-background">
      <PaymentReturnHandler />
      <ConsoleHeader
        title={title}
        walletName={wallet?.ownerName}
        onCheckoutComplete={bumpRefresh}
        sidebar={<ConsoleSidebar />}
        onOpenHelp={restart}
      />
      <div className="yypay:mx-auto yypay:flex yypay:w-full yypay:max-w-6xl yypay:flex-1 yypay:items-start yypay:gap-6 yypay:px-4 yypay:py-8 sm:yypay:px-6">
        <aside className="yypay:sticky yypay:top-24 yypay:hidden yypay:w-56 yypay:shrink-0 lg:yypay:block">
          <ConsoleSidebar />
        </aside>

        <main className="yypay:min-w-0 yypay:flex-1">{children}</main>
      </div>
    </div>
  );
}

export function ConsoleShell({ children }: { children: ReactNode }) {
  return (
    <ConsoleDataProvider>
      <OnboardingProvider>
        <ConsoleChrome>{children}</ConsoleChrome>
      </OnboardingProvider>
    </ConsoleDataProvider>
  );
}
