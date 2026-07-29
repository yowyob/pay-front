import type { Messages } from "@/i18n/messages/fr";
import type { components } from "@/types/schemas-payment";

type CommercialPlanResponse = components["schemas"]["CommercialPlanResponse"];

export type BillingPeriod = "MONTHLY" | "YEARLY";

export function getPlanLabel(plan: CommercialPlanResponse, t: Messages): string {
  return plan.displayName?.trim() || plan.code || t.plans.defaultPlanFallback;
}

function targetTypeKey(
  targetType: string,
): keyof Messages["plans"]["targetTypes"] | undefined {
  switch (targetType) {
    case "ORGANIZATION":
      return "organization";
    case "ENTERPRISE":
      return "enterprise";
    case "SMB":
      return "smb";
    default:
      return undefined;
  }
}

function serviceKey(code: string): keyof Messages["plans"]["services"] | undefined {
  switch (code) {
    case "ACCOUNTING":
      return "accounting";
    case "CASHIER":
      return "cashier";
    case "TREASURY":
      return "treasury";
    case "COMMERCIAL":
      return "commercial";
    case "PRODUCT":
      return "product";
    case "INVENTORY":
      return "inventory";
    case "HR":
      return "hr";
    case "PAYROLL":
      return "payroll";
    case "CRM":
      return "crm";
    case "REPORTING":
      return "reporting";
    default:
      return undefined;
  }
}

function packKey(code: string): keyof Messages["plans"]["packs"] | undefined {
  switch (code) {
    case "STARTER_PACK":
      return "starter";
    case "GROWTH_PACK":
      return "growth";
    case "ENTERPRISE_PACK":
      return "enterprise";
    default:
      return undefined;
  }
}

export function getTargetTypeLabel(
  targetType: string | null | undefined,
  t: Messages,
): string | null {
  const trimmed = targetType?.trim();
  if (!trimmed) {
    return null;
  }
  const key = targetTypeKey(trimmed);
  return key ? t.plans.targetTypes[key] : trimmed;
}

export function formatBillingPeriodLabel(
  period: BillingPeriod,
  t: Messages,
): string {
  return period === "MONTHLY" ? t.plans.billingPeriod.monthly : t.plans.billingPeriod.yearly;
}

export function formatQuotedPrice(
  total: number | null | undefined,
  currency: string | null | undefined,
  billingPeriod: BillingPeriod | undefined,
  t: Messages,
  intlTag: string,
): string | null {
  if (total == null) {
    return null;
  }
  const suffix = billingPeriod === "YEARLY" ? t.plans.perYear : t.plans.perMonth;
  return `${total.toLocaleString(intlTag)} ${currency ?? "XAF"}${suffix}`;
}

export function formatFeatureLabel(code: string, t: Messages): string {
  const serviceLabelKey = serviceKey(code);
  if (serviceLabelKey) return t.plans.services[serviceLabelKey];
  const packLabelKey = packKey(code);
  if (packLabelKey) return t.plans.packs[packLabelKey];
  return code
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export function getPlanFeatures(plan: CommercialPlanResponse, t: Messages): string[] {
  const packs = (plan.packCodes ?? []).map(
    (code) => `${formatFeatureLabel(code, t)} ${t.plans.addOnPackSuffix}`,
  );
  const services = (plan.serviceCodes ?? []).map((code) => formatFeatureLabel(code, t));
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
  total: number | null | undefined,
  currency: string | null | undefined,
  t: Messages,
  intlTag: string,
): string | null {
  if (total == null) {
    return null;
  }
  const monthly = Math.round(total / 12);
  return t.plans.yearlyMonthlyEquivalent(
    `${monthly.toLocaleString(intlTag)} ${currency ?? "XAF"}`,
  );
}
