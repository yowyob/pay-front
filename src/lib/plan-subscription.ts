import { getPlanLabel } from "@/lib/commercial-plan-display";
import type { components } from "@/types/schemas-payment";

type SubscriptionResponse = components["schemas"]["SubscriptionResponse"];
type CommercialPlanResponse = components["schemas"]["CommercialPlanResponse"];
type CommercialPlanOrderResponse =
  components["schemas"]["CommercialPlanOrderResponse"];

export type PurchaseGuardResult = {
  allowed: boolean;
  reason?: string;
  activeSubscription?: SubscriptionResponse;
};

export function isSubscriptionStillValid(
  subscription: SubscriptionResponse,
  now = Date.now(),
): boolean {
  if (!subscription.active) {
    return false;
  }
  if (!subscription.paidUntil) {
    return false;
  }
  const paidUntil = Date.parse(subscription.paidUntil);
  return !Number.isNaN(paidUntil) && paidUntil > now;
}

export function getActiveSubscription(
  subscriptions: SubscriptionResponse[],
  now = Date.now(),
): SubscriptionResponse | undefined {
  return subscriptions.find((subscription) =>
    isSubscriptionStillValid(subscription, now),
  );
}

export function formatPaidUntil(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function getActiveSubscriptionLabel(
  subscription: SubscriptionResponse,
  plans: CommercialPlanResponse[] = [],
): string {
  const plan = plans.find((item) => item.code === subscription.planCode);
  return plan ? getPlanLabel(plan) : subscription.planCode ?? "Plan";
}

export function buildActiveSubscriptionBlockMessage(
  subscription: SubscriptionResponse,
  plans: CommercialPlanResponse[] = [],
): string {
  const label = getActiveSubscriptionLabel(subscription, plans);
  const until = formatPaidUntil(subscription.paidUntil);
  const untilText = until ? ` jusqu'au ${until}` : "";
  return `Votre abonnement ${label} est actif${untilText}. Le renouvellement manuel sera possible après cette date, ou activez le renouvellement automatique.`;
}

export function canPurchasePlan(
  subscriptions: SubscriptionResponse[],
  plans: CommercialPlanResponse[] = [],
  now = Date.now(),
): PurchaseGuardResult {
  const activeSubscription = getActiveSubscription(subscriptions, now);
  if (!activeSubscription) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: buildActiveSubscriptionBlockMessage(activeSubscription, plans),
    activeSubscription,
  };
}

export function getPendingPlanCodes(
  orders: CommercialPlanOrderResponse[],
  organizationId?: string | null,
): Set<string> {
  const pending = new Set<string>();
  for (const order of orders) {
    if (order.status !== "PENDING_PAYMENT") {
      continue;
    }
    if (organizationId && order.organizationId !== organizationId) {
      continue;
    }
    if (order.planCode) {
      pending.add(order.planCode);
    }
  }
  return pending;
}

export function buildPendingPaymentMessage(planCode: string): string {
  return `Un paiement est déjà en cours pour le plan ${planCode}. Finalisez-le ou attendez son expiration avant d'en lancer un nouveau.`;
}
