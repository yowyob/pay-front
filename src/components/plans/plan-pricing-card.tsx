"use client";

import { PlanAutoRenewalToggle } from "@/components/plans/plan-auto-renewal-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    formatBillingPeriodLabel,
    formatFeatureLabel,
    formatQuotedPrice,
    formatYearlyMonthlyEquivalent,
    getPlanFeatures,
    getPlanLabel,
    type BillingPeriod,
} from "@/lib/commercial-plan-display";
import {
    formatPaidUntil,
    isSubscriptionStillValid,
} from "@/lib/plan-subscription";
import { cn } from "@/lib/utils";
import type { components } from "@/types/schemas-payment";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

type CommercialPlanResponse = components["schemas"]["CommercialPlanResponse"];
type CommercialPlanQuoteResponse =
  components["schemas"]["CommercialPlanQuoteResponse"];
type SubscriptionResponse = components["schemas"]["SubscriptionResponse"];
type AutoRenewalResponse = components["schemas"]["AutoRenewalResponse"];

const VISIBLE_FEATURES = 5;

type PlanPricingCardProps = {
  plan: CommercialPlanResponse;
  quote?: CommercialPlanQuoteResponse | null;
  quoteLoading?: boolean;
  billingPeriod: BillingPeriod;
  highlighted?: boolean;
  activeSubscription?: SubscriptionResponse | null;
  autoRenewal?: AutoRenewalResponse | null;
  autoRenewalLoading?: boolean;
  autoRenewalMutating?: boolean;
  onEnableAutoRenewal?: () => void | Promise<void>;
  onDisableAutoRenewal?: () => void | Promise<void>;
  inCart?: boolean;
  isPendingPayment?: boolean;
  purchaseBlocked?: boolean;
  blockMessage?: string;
  ctaLabel?: string;
  onSelect?: () => void;
  disabled?: boolean;
};

export function PlanPricingCard({
  plan,
  quote,
  quoteLoading = false,
  billingPeriod,
  highlighted = false,
  activeSubscription = null,
  autoRenewal = null,
  autoRenewalLoading = false,
  autoRenewalMutating = false,
  onEnableAutoRenewal,
  onDisableAutoRenewal,
  inCart = false,
  isPendingPayment = false,
  purchaseBlocked = false,
  blockMessage,
  ctaLabel = "Sélectionner",
  onSelect,
  disabled = false,
}: PlanPricingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const planCode = plan.code ?? "";
  const features = getPlanFeatures(plan);
  const addOns = plan.compatibleAddOnCodes ?? [];
  const visibleFeatures = expanded ? features : features.slice(0, VISIBLE_FEATURES);
  const hasMoreFeatures = features.length > VISIBLE_FEATURES || addOns.length > 0;
  const quotedPrice = formatQuotedPrice(
    quote?.total,
    quote?.currency,
    billingPeriod,
  );
  const yearlyNote =
    billingPeriod === "YEARLY"
      ? formatYearlyMonthlyEquivalent(quote?.total, quote?.currency)
      : null;

  const isActivePlan = Boolean(
    activeSubscription &&
      activeSubscription.planCode === planCode &&
      isSubscriptionStillValid(activeSubscription),
  );

  const paidUntilLabel = formatPaidUntil(activeSubscription?.paidUntil);

  const ctaDisabled =
    disabled ||
    purchaseBlocked ||
    isActivePlan ||
    inCart ||
    isPendingPayment ||
    quoteLoading ||
    !quotedPrice ||
    !onSelect;

  let ctaText = ctaLabel;
  if (isActivePlan) {
    ctaText = paidUntilLabel
      ? `Actif jusqu'au ${paidUntilLabel}`
      : "Plan actif";
  } else if (isPendingPayment) {
    ctaText = "Paiement en cours";
  } else if (inCart) {
    ctaText = "Dans le panier";
  } else if (quoteLoading) {
    ctaText = "Calcul du tarif…";
  } else if (!quotedPrice) {
    ctaText = "Devis indisponible";
  }

  return (
    <article
      className={cn(
        "yypay:relative yypay:flex yypay:h-full yypay:flex-col yypay:rounded-2xl yypay:border yypay:bg-card yypay:transition-all yypay:duration-200",
        highlighted
          ? "yypay:z-10 yypay:border-primary yypay:shadow-popular lg:yypay:scale-[1.02]"
          : "yypay:border-border yypay:shadow-card hover:yypay:-translate-y-0.5 hover:yypay:shadow-card-hover",
      )}
    >
      {highlighted && (
        <div className="yypay:rounded-t-2xl yypay:bg-primary yypay:px-4 yypay:py-2 yypay:text-center yypay:text-xs yypay:font-semibold yypay:tracking-wide yypay:text-primary-foreground yypay:uppercase">
          Le plus populaire
        </div>
      )}

      <div className="yypay:flex yypay:flex-1 yypay:flex-col yypay:p-6 sm:yypay:p-7">
        <div className="yypay:space-y-1">
          <h3 className="yypay:text-xl yypay:font-bold yypay:text-foreground sm:yypay:text-2xl">
            {getPlanLabel(plan)}
          </h3>
          {plan.description ? (
            <p className="yypay:text-sm yypay:text-muted-foreground">
              {plan.description}
            </p>
          ) : (
            <p className="yypay:text-sm yypay:text-muted-foreground">
              Plan {plan.code}
            </p>
          )}
        </div>

        <div className="yypay:mt-6 yypay:min-h-[4.5rem]">
          {quoteLoading ? (
            <Skeleton className="yypay:h-10 yypay:w-40" />
          ) : quotedPrice ? (
            <>
              <p className="yypay:text-3xl yypay:font-bold yypay:tracking-tight yypay:text-foreground sm:yypay:text-4xl">
                {quotedPrice}
              </p>
              {yearlyNote && (
                <p className="yypay:mt-1 yypay:text-xs yypay:text-muted-foreground">
                  {yearlyNote}
                </p>
              )}
            </>
          ) : (
            <p className="yypay:text-sm yypay:text-muted-foreground">
              Tarif {formatBillingPeriodLabel(billingPeriod).toLowerCase()} sur devis
            </p>
          )}
          <p className="yypay:mt-2 yypay:text-xs yypay:text-muted-foreground">
            Prix calculé côté serveur - sans surprise à la caisse.
          </p>
        </div>

        <Button
          type="button"
          className="yypay:mt-6 yypay:h-11 yypay:w-full yypay:text-sm yypay:font-semibold"
          variant={highlighted && !isActivePlan ? "default" : "outline"}
          disabled={ctaDisabled}
          onClick={onSelect}
        >
          {ctaText}
        </Button>

        {blockMessage && purchaseBlocked && !isActivePlan && (
          <p className="yypay:mt-2 yypay:text-xs yypay:text-muted-foreground">
            {blockMessage}
          </p>
        )}

        {isPendingPayment && (
          <p className="yypay:mt-2 yypay:text-xs yypay:text-muted-foreground">
            Finalisez le paiement MYCOOLPAY en cours avant d&apos;en lancer un
            nouveau.
          </p>
        )}

        {isActivePlan && onEnableAutoRenewal && onDisableAutoRenewal && planCode && (
          <PlanAutoRenewalToggle
            className="yypay:mt-4"
            planCode={planCode}
            billingPeriod={billingPeriod}
            autoRenewal={autoRenewal}
            loading={autoRenewalLoading}
            mutating={autoRenewalMutating}
            onEnable={onEnableAutoRenewal}
            onDisable={onDisableAutoRenewal}
          />
        )}

        <ul className="yypay:mt-8 yypay:flex-1 yypay:space-y-3">
          {visibleFeatures.map((feature) => (
            <li
              key={feature}
              className="yypay:flex yypay:items-start yypay:gap-2.5 yypay:text-sm yypay:text-foreground"
            >
              <Check
                className="yypay:mt-0.5 yypay:h-4 yypay:w-4 yypay:shrink-0 yypay:text-success"
                aria-hidden
              />
              <span>{feature}</span>
            </li>
          ))}
          {expanded &&
            addOns.map((code) => (
              <li
                key={code}
                className="yypay:flex yypay:items-start yypay:gap-2.5 yypay:text-sm yypay:text-muted-foreground"
              >
                <Check
                  className="yypay:mt-0.5 yypay:h-4 yypay:w-4 yypay:shrink-0 yypay:text-success/70"
                  aria-hidden
                />
                <span>Add-on : {formatFeatureLabel(code)}</span>
              </li>
            ))}
        </ul>

        {hasMoreFeatures && (
          <button
            type="button"
            className="yypay:mt-4 yypay:inline-flex yypay:items-center yypay:gap-1 yypay:text-sm yypay:font-medium yypay:text-primary hover:yypay:underline"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? "Réduire" : "Voir toutes les fonctionnalités"}
            {expanded ? (
              <ChevronUp className="yypay:h-4 yypay:w-4" />
            ) : (
              <ChevronDown className="yypay:h-4 yypay:w-4" />
            )}
          </button>
        )}

        <div className="yypay:mt-5 yypay:flex yypay:flex-wrap yypay:gap-2">
          {plan.systemDefault && <Badge>Par défaut</Badge>}
          {isActivePlan && <Badge variant="success">Actif</Badge>}
          {isPendingPayment && <Badge variant="secondary">Paiement en cours</Badge>}
        </div>
      </div>
    </article>
  );
}
