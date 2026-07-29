import { Badge } from "@/components/ui/badge";
import { toIntlTag } from "@/i18n/format";
import { useLocale } from "@/i18n/locale-provider";
import {
    formatBillingPeriodLabel,
    formatQuotedPrice,
    getPlanLabel,
    getTargetTypeLabel,
    type BillingPeriod,
} from "@/lib/commercial-plan-display";
import type { components } from "@/types/schemas-payment";

type CommercialPlanResponse = components["schemas"]["CommercialPlanResponse"];
type CommercialPlanQuoteResponse =
  components["schemas"]["CommercialPlanQuoteResponse"];

type CommercialPlanDetailsProps = {
  plan: CommercialPlanResponse;
  quote?: CommercialPlanQuoteResponse | null;
  quoteLoading?: boolean;
  billingPeriod?: BillingPeriod;
  className?: string;
};

function CodeList({
  title,
  codes,
}: {
  title: string;
  codes: string[];
}) {
  if (codes.length === 0) {
    return null;
  }

  return (
    <div className="yypay:space-y-2">
      <p className="yypay:text-xs yypay:font-medium yypay:uppercase yypay:tracking-wide yypay:text-secondary">
        {title}
      </p>
      <div className="yypay:flex yypay:flex-wrap yypay:gap-2">
        {codes.map((code) => (
          <Badge key={code} variant="secondary">
            {code}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function CommercialPlanDetails({
  plan,
  quote,
  quoteLoading = false,
  billingPeriod = "MONTHLY",
  className,
}: CommercialPlanDetailsProps) {
  const { t, locale } = useLocale();
  const intlTag = toIntlTag(locale);
  const targetTypeLabel = getTargetTypeLabel(plan.targetType, t);
  const quotedPrice = formatQuotedPrice(
    quote?.total,
    quote?.currency,
    billingPeriod,
    t,
    intlTag,
  );

  return (
    <div className={className ?? "yypay:space-y-4"}>
      <div className="yypay:flex yypay:flex-wrap yypay:gap-2">
        {plan.systemDefault && <Badge>{t.plans.details.defaultPlan}</Badge>}
        {targetTypeLabel && <Badge variant="secondary">{targetTypeLabel}</Badge>}
        {plan.code && (
          <Badge variant="secondary" className="yypay:font-mono">
            {plan.code}
          </Badge>
        )}
      </div>

      {plan.description && (
        <p className="yypay:text-sm yypay:text-secondary">{plan.description}</p>
      )}

      <div className="yypay:rounded-lg yypay:border yypay:border-border yypay:bg-muted/40 yypay:p-3">
        <p className="yypay:text-xs yypay:font-medium yypay:uppercase yypay:tracking-wide yypay:text-muted-foreground">
          {t.plans.details.tariff(formatBillingPeriodLabel(billingPeriod, t).toLowerCase())}
        </p>
        {quoteLoading ? (
          <p className="yypay:mt-1 yypay:text-sm yypay:text-muted-foreground">
            {t.plans.details.calculatingQuote}
          </p>
        ) : quotedPrice ? (
          <p className="yypay:mt-1 yypay:text-2xl yypay:font-bold yypay:text-foreground">
            {quotedPrice}
          </p>
        ) : (
          <p className="yypay:mt-1 yypay:text-sm yypay:text-muted-foreground">
            {t.plans.details.quoteUnavailableFor(getPlanLabel(plan, t))}
          </p>
        )}
        <p className="yypay:mt-2 yypay:text-xs yypay:text-muted-foreground">
          {t.plans.details.serverNote}{" "}
          <span className="yypay:font-mono">POST /api/plans/&#123;planCode&#125;/quote</span>
          .
        </p>
      </div>

      <CodeList title={t.plans.details.includedPacks} codes={plan.packCodes ?? []} />
      <CodeList title={t.plans.details.includedServices} codes={plan.serviceCodes ?? []} />
      <CodeList
        title={t.plans.details.compatibleAddOns}
        codes={plan.compatibleAddOnCodes ?? []}
      />
    </div>
  );
}
