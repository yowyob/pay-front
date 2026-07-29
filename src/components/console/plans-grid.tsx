"use client";

import { PlansPricingSection } from "@/components/plans/plans-pricing-section";
import { useCommercialPlanQuotes } from "@/hooks/use-commercial-plan-quotes";
import { usePlanAutoRenewals } from "@/hooks/use-plan-auto-renewals";
import { toIntlTag } from "@/i18n/format";
import { useLocale } from "@/i18n/locale-provider";
import { bffGet } from "@/lib/bff-client";
import { getPlanLabel } from "@/lib/commercial-plan-display";
import {
    buildPendingPaymentMessage,
    canPurchasePlan,
    getPendingPlanCodes,
} from "@/lib/plan-subscription";
import { useCartStore } from "@/stores/cart-store";
import type { components } from "@/types/schemas-payment";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type CommercialPlanResponse = components["schemas"]["CommercialPlanResponse"];
type SubscriptionResponse = components["schemas"]["SubscriptionResponse"];
type CommercialPlanOrderResponse =
  components["schemas"]["CommercialPlanOrderResponse"];
type BillingPeriod = "MONTHLY" | "YEARLY";

type PlansGridProps = {
  refreshKey?: number;
};

export function PlansGrid({ refreshKey = 0 }: PlansGridProps) {
  const { t, locale } = useLocale();
  const intlTag = toIntlTag(locale);
  const [plans, setPlans] = useState<CommercialPlanResponse[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionResponse[]>([]);
  const [pendingPlanCodes, setPendingPlanCodes] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("MONTHLY");
  const addPlan = useCartStore((state) => state.addPlan);
  const hasPlan = useCartStore((state) => state.hasPlan);
  const { quotes, loading: quotesLoading } = useCommercialPlanQuotes(
    plans,
    billingPeriod,
  );
  const {
    renewalsByPlanCode,
    loading: autoRenewalsLoading,
    mutatingPlanCode,
    reload: reloadAutoRenewals,
    enable: enableAutoRenewal,
    disable: disableAutoRenewal,
  } = usePlanAutoRenewals();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansData, subsData, ordersData, session] = await Promise.all([
        bffGet<CommercialPlanResponse[]>("/api/plans"),
        bffGet<SubscriptionResponse[]>("/api/plans/subscriptions"),
        bffGet<CommercialPlanOrderResponse[]>("/api/commercial-plans/orders"),
        bffGet<{ organizationId?: string | null }>("/api/session/context"),
      ]);
      setPlans(Array.isArray(plansData) ? plansData : []);
      setSubscriptions(Array.isArray(subsData) ? subsData : []);
      setPendingPlanCodes(
        getPendingPlanCodes(
          Array.isArray(ordersData) ? ordersData : [],
          session.organizationId,
        ),
      );
      await reloadAutoRenewals();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.plans.loadError);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadAutoRenewals]);

  useEffect(() => {
    let cancelled = false;
    const timer = globalThis.setTimeout(() => {
      if (!cancelled) {
        void loadData();
      }
    }, 0);

    return () => {
      cancelled = true;
      globalThis.clearTimeout(timer);
    };
  }, [loadData, refreshKey]);

  const purchaseGuard = canPurchasePlan(subscriptions, plans, t, intlTag);

  async function handleEnableAutoRenewal(planCode: string) {
    try {
      await enableAutoRenewal(planCode, { billingPeriod });
      toast.success(t.plans.autoRenewalEnabled);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t.plans.autoRenewalEnableError,
      );
    }
  }

  async function handleDisableAutoRenewal(planCode: string) {
    try {
      await disableAutoRenewal(planCode);
      toast.success(t.plans.autoRenewalDisabled);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t.plans.autoRenewalDisableError,
      );
    }
  }

  return (
    <PlansPricingSection
      plans={plans}
      loading={loading}
      quotes={quotes}
      quotesLoading={quotesLoading}
      billingPeriod={billingPeriod}
      onBillingPeriodChange={setBillingPeriod}
      activeSubscription={purchaseGuard.activeSubscription ?? null}
      purchaseBlockMessage={purchaseGuard.reason}
      pendingPlanCodes={pendingPlanCodes}
      autoRenewalsByPlanCode={renewalsByPlanCode}
      autoRenewalsLoading={autoRenewalsLoading}
      autoRenewalMutatingPlanCode={mutatingPlanCode}
      hasPlanInCart={(planCode) => hasPlan(planCode)}
      getCtaLabel={() => t.cart.addToCart}
      onEnableAutoRenewal={handleEnableAutoRenewal}
      onDisableAutoRenewal={handleDisableAutoRenewal}
      onSelectPlan={(plan) => {
        const planCode = plan.code;
        if (!planCode) {
          toast.error(t.plans.invalidPlan);
          return;
        }

        if (!purchaseGuard.allowed) {
          toast.error(purchaseGuard.reason ?? t.plans.purchaseUnavailable);
          return;
        }

        if (pendingPlanCodes.has(planCode)) {
          toast.error(buildPendingPaymentMessage(planCode, t));
          return;
        }

        if (!quotes[planCode]?.total) {
          toast.error(t.plans.quoteUnavailable);
          return;
        }

        if (hasPlan(planCode)) {
          return;
        }

        addPlan(plan);
        toast.success(t.plans.addedToCart(getPlanLabel(plan, t)));
      }}
    />
  );
}
