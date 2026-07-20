import type { components } from "@/types/schemas-payment";

type CommercialPlanResponse = components["schemas"]["CommercialPlanResponse"];

export type BillingPeriod = "MONTHLY" | "YEARLY";

export function getPlanLabel(plan: CommercialPlanResponse): string {
  return plan.displayName?.trim() || plan.code || "Plan";
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  ORGANIZATION: "Organisation",
  ENTERPRISE: "Entreprise",
  SMB: "PME",
};

const SERVICE_LABELS: Record<string, string> = {
  ACCOUNTING: "Comptabilité",
  CASHIER: "Caisse",
  TREASURY: "Trésorerie",
  COMMERCIAL: "Commercial",
  PRODUCT: "Produits",
  INVENTORY: "Stock",
  HR: "Ressources humaines",
  PAYROLL: "Paie",
  CRM: "CRM",
  REPORTING: "Reporting",
};

const PACK_LABELS: Record<string, string> = {
  STARTER_PACK: "Pack démarrage",
  GROWTH_PACK: "Pack croissance",
  ENTERPRISE_PACK: "Pack entreprise",
};

export function getTargetTypeLabel(targetType?: string | null): string | null {
  const trimmed = targetType?.trim();
  if (!trimmed) {
    return null;
  }
  return TARGET_TYPE_LABELS[trimmed] ?? trimmed;
}

export function formatBillingPeriodLabel(period: BillingPeriod): string {
  return period === "MONTHLY" ? "Mensuel" : "Annuel";
}

export function formatQuotedPrice(
  total?: number | null,
  currency?: string | null,
  billingPeriod?: BillingPeriod,
): string | null {
  if (total == null) {
    return null;
  }
  const suffix = billingPeriod === "YEARLY" ? "/an" : "/mois";
  return `${total.toLocaleString("fr-FR")} ${currency ?? "XAF"}${suffix}`;
}

export function formatFeatureLabel(code: string): string {
  return (
    SERVICE_LABELS[code] ??
    PACK_LABELS[code] ??
    code
      .split("_")
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(" ")
  );
}

export function getPlanFeatures(plan: CommercialPlanResponse): string[] {
  const packs = (plan.packCodes ?? []).map(
    (code) => `${formatFeatureLabel(code)} (pack)`,
  );
  const services = (plan.serviceCodes ?? []).map(formatFeatureLabel);
  return [...packs, ...services];
}

export function getPopularPlanCode(
  plans: CommercialPlanResponse[],
): string | null {
  const preferred = plans.find((plan) => plan.code === "COMMERCE");
  if (preferred?.code) {
    return preferred.code;
  }

  if (plans.length >= 2) {
    const middleIndex = Math.floor(plans.length / 2);
    return plans[middleIndex]?.code ?? null;
  }

  return plans[0]?.code ?? null;
}

export function formatYearlyMonthlyEquivalent(
  total?: number | null,
  currency?: string | null,
): string | null {
  if (total == null) {
    return null;
  }
  const monthly = Math.round(total / 12);
  return `soit ${monthly.toLocaleString("fr-FR")} ${currency ?? "XAF"}/mois en facturation annuelle`;
}
