"use client";

import { useLocale } from "@/i18n/locale-provider";
import {
    formatBillingPeriodLabel,
    type BillingPeriod,
} from "@/lib/commercial-plan-display";
import { cn } from "@/lib/utils";

type BillingPeriodToggleProps = {
  value: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
  className?: string;
};

export function BillingPeriodToggle({
  value,
  onChange,
  className,
}: BillingPeriodToggleProps) {
  const { t } = useLocale();
  return (
    <div
      className={cn(
        "yypay:inline-flex yypay:rounded-full yypay:border yypay:border-border yypay:bg-card yypay:p-1 yypay:shadow-sm",
        className,
      )}
      role="group"
      aria-label={t.plans.billingToggleAriaLabel}
    >
      {(["MONTHLY", "YEARLY"] as const).map((period) => {
        const selected = value === period;
        return (
          <button
            key={period}
            type="button"
            onClick={() => onChange(period)}
            className={cn(
              "yypay:rounded-full yypay:px-4 yypay:py-2 yypay:text-sm yypay:font-medium yypay:transition-all",
              "yypay:min-w-[5.5rem] sm:yypay:min-w-[6.5rem]",
              selected
                ? "yypay:bg-primary yypay:text-primary-foreground yypay:shadow-sm"
                : "yypay:text-secondary hover:yypay:bg-muted hover:yypay:text-foreground",
            )}
            aria-pressed={selected}
          >
            {formatBillingPeriodLabel(period, t)}
          </button>
        );
      })}
    </div>
  );
}
