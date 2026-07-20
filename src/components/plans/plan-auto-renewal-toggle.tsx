"use client";

import { Button } from "@/components/ui/button";
import { formatBillingPeriodLabel, type BillingPeriod } from "@/lib/commercial-plan-display";
import { cn } from "@/lib/utils";
import type { components } from "@/types/schemas-payment";
import { Loader2, RefreshCw } from "lucide-react";

type AutoRenewalResponse = components["schemas"]["AutoRenewalResponse"];

type PlanAutoRenewalToggleProps = {
  planCode: string;
  billingPeriod: BillingPeriod;
  autoRenewal?: AutoRenewalResponse | null;
  loading?: boolean;
  mutating?: boolean;
  onEnable: () => void | Promise<void>;
  onDisable: () => void | Promise<void>;
  className?: string;
};

export function PlanAutoRenewalToggle({
  planCode,
  billingPeriod,
  autoRenewal,
  loading = false,
  mutating = false,
  onEnable,
  onDisable,
  className,
}: PlanAutoRenewalToggleProps) {
  const isActive = autoRenewal?.active === true;
  const renewalPeriod = autoRenewal?.billingPeriod as BillingPeriod | undefined;

  if (loading) {
    return (
      <div
        className={cn(
          "yypay:flex yypay:items-center yypay:gap-2 yypay:rounded-lg yypay:border yypay:border-border yypay:bg-muted/40 yypay:px-3 yypay:py-3 yypay:text-sm yypay:text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="yypay:h-4 yypay:w-4 yypay:animate-spin" />
        Chargement du renouvellement automatique…
      </div>
    );
  }

  return (
    <div
      className={cn(
        "yypay:rounded-lg yypay:border yypay:border-border yypay:bg-muted/30 yypay:p-3",
        className,
      )}
    >
      <div className="yypay:flex yypay:items-start yypay:justify-between yypay:gap-3">
        <div className="yypay:min-w-0">
          <p className="yypay:text-sm yypay:font-medium yypay:text-foreground">
            Renouvellement automatique
          </p>
          <p className="yypay:mt-1 yypay:text-xs yypay:text-muted-foreground">
            {isActive
              ? `Activé (${formatBillingPeriodLabel(renewalPeriod ?? billingPeriod).toLowerCase()}). Le plan sera renouvelé avant expiration.`
              : `Renouveler automatiquement en facturation ${formatBillingPeriodLabel(billingPeriod).toLowerCase()}.`}
          </p>
        </div>
        <RefreshCw
          className={cn(
            "yypay:mt-0.5 yypay:h-4 yypay:w-4 yypay:shrink-0",
            isActive ? "yypay:text-primary" : "yypay:text-muted-foreground",
          )}
          aria-hidden
        />
      </div>

      <Button
        type="button"
        variant={isActive ? "outline" : "default"}
        size="sm"
        className="yypay:mt-3 yypay:w-full"
        disabled={mutating}
        onClick={() => {
          if (isActive) {
            void onDisable();
          } else {
            void onEnable();
          }
        }}
      >
        {mutating ? (
          <Loader2 className="yypay:h-4 yypay:w-4 yypay:animate-spin" />
        ) : null}
        {isActive ? "Désactiver le renouvellement auto" : "Activer le renouvellement auto"}
      </Button>

      <p className="yypay:mt-2 yypay:text-[11px] yypay:text-muted-foreground">
        Plan {planCode} - préférence enregistrée côté Kernel.
      </p>
    </div>
  );
}
