"use client";

import { BillingPeriodToggle } from "@/components/plans/billing-period-toggle";
import { PlanPricingCard } from "@/components/plans/plan-pricing-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    getPopularPlanCode,
    type BillingPeriod,
} from "@/lib/commercial-plan-display";
import { cn } from "@/lib/utils";
import type { components } from "@/types/schemas-payment";

type CommercialPlanResponse = components["schemas"]["CommercialPlanResponse"];
type CommercialPlanQuoteResponse =
  components["schemas"]["CommercialPlanQuoteResponse"];
type SubscriptionResponse = components["schemas"]["SubscriptionResponse"];
type AutoRenewalResponse = components["schemas"]["AutoRenewalResponse"];

type PlansPricingSectionProps = {
  plans: CommercialPlanResponse[];
  loading?: boolean;
  quotes: Record<string, CommercialPlanQuoteResponse>;
  quotesLoading?: boolean;
  billingPeriod: BillingPeriod;
  onBillingPeriodChange?: (period: BillingPeriod) => void;
  showBillingToggle?: boolean;
  activeSubscription?: SubscriptionResponse | null;
  purchaseBlockMessage?: string;
  pendingPlanCodes?: Set<string>;
  autoRenewalsByPlanCode?: Record<string, AutoRenewalResponse>;
  autoRenewalsLoading?: boolean;
  autoRenewalMutatingPlanCode?: string | null;
  hasPlanInCart?: (planCode: string) => boolean;
  onSelectPlan?: (plan: CommercialPlanResponse) => void;
  onEnableAutoRenewal?: (planCode: string) => void | Promise<void>;
  onDisableAutoRenewal?: (planCode: string) => void | Promise<void>;
  getCtaLabel?: (plan: CommercialPlanResponse) => string;
  className?: string;
  id?: string;
};

export function PlansPricingSection({
  plans,
  loading = false,
  quotes,
  quotesLoading = false,
  billingPeriod,
  onBillingPeriodChange,
  showBillingToggle = true,
  activeSubscription = null,
  purchaseBlockMessage,
  pendingPlanCodes = new Set(),
  autoRenewalsByPlanCode = {},
  autoRenewalsLoading = false,
  autoRenewalMutatingPlanCode = null,
  hasPlanInCart,
  onSelectPlan,
  onEnableAutoRenewal,
  onDisableAutoRenewal,
  getCtaLabel,
  className,
  id,
}: PlansPricingSectionProps) {
  const popularPlanCode = getPopularPlanCode(plans);
  const purchaseBlocked = Boolean(activeSubscription && purchaseBlockMessage);

  return (
    <section id={id} className={cn("yypay:w-full", className)}>
      <div className="yypay:mx-auto yypay:max-w-3xl yypay:text-center">
        <h2 className="yypay:text-2xl yypay:font-bold yypay:tracking-tight yypay:text-foreground sm:yypay:text-4xl">
          Choisissez le meilleur plan pour vous
        </h2>
        <p className="yypay:mt-3 yypay:text-base yypay:text-muted-foreground sm:yypay:text-lg">
          Vous pouvez changer de plan à tout moment. Les tarifs sont recalculés
          côté serveur avant chaque paiement.
        </p>

        {purchaseBlocked && purchaseBlockMessage && (
          <p className="yypay:mt-4 yypay:rounded-lg yypay:border yypay:border-border yypay:bg-muted/40 yypay:px-4 yypay:py-3 yypay:text-sm yypay:text-muted-foreground">
            {purchaseBlockMessage}
          </p>
        )}

        {showBillingToggle && onBillingPeriodChange && (
          <div className="yypay:mt-8 yypay:flex yypay:justify-center">
            <BillingPeriodToggle
              value={billingPeriod}
              onChange={onBillingPeriodChange}
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="yypay:mx-auto yypay:mt-10 yypay:grid yypay:max-w-7xl yypay:grid-cols-1 yypay:gap-6 sm:yypay:mt-12 md:yypay:grid-cols-2 xl:yypay:grid-cols-3 2xl:yypay:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="yypay:h-[32rem] yypay:rounded-2xl" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <p className="yypay:mt-10 yypay:text-center yypay:text-muted-foreground">
          Aucun plan disponible pour le moment.
        </p>
      ) : (
        <div className="yypay:mx-auto yypay:mt-10 yypay:grid yypay:max-w-7xl yypay:grid-cols-1 yypay:items-stretch yypay:gap-6 sm:yypay:mt-12 md:yypay:grid-cols-2 xl:yypay:grid-cols-3 2xl:yypay:grid-cols-4">
          {plans.map((plan) => {
            const planCode = plan.code ?? "";
            const highlighted = Boolean(planCode && planCode === popularPlanCode);

            return (
              <PlanPricingCard
                key={planCode || plan.displayName}
                plan={plan}
                quote={planCode ? quotes[planCode] : undefined}
                quoteLoading={quotesLoading}
                billingPeriod={billingPeriod}
                highlighted={highlighted}
                activeSubscription={activeSubscription}
                autoRenewal={
                  planCode ? autoRenewalsByPlanCode[planCode] : undefined
                }
                autoRenewalLoading={autoRenewalsLoading}
                autoRenewalMutating={autoRenewalMutatingPlanCode === planCode}
                onEnableAutoRenewal={
                  onEnableAutoRenewal && planCode
                    ? () => onEnableAutoRenewal(planCode)
                    : undefined
                }
                onDisableAutoRenewal={
                  onDisableAutoRenewal && planCode
                    ? () => onDisableAutoRenewal(planCode)
                    : undefined
                }
                inCart={planCode ? (hasPlanInCart?.(planCode) ?? false) : false}
                isPendingPayment={planCode ? pendingPlanCodes.has(planCode) : false}
                purchaseBlocked={purchaseBlocked}
                blockMessage={purchaseBlockMessage}
                ctaLabel={getCtaLabel?.(plan) ?? "Sélectionner"}
                onSelect={onSelectPlan ? () => onSelectPlan(plan) : undefined}
                disabled={!onSelectPlan}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
