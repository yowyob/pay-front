import type { Messages } from "@/i18n/messages/fr";
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

export function formatPaidUntil(
  value: string | null | undefined,
  intlTag: string,
): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString(intlTag, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function getActiveSubscriptionLabel(
  subscription: SubscriptionResponse,
  plans: CommercialPlanResponse[] = [],
  t: Messages,
): string {
  const plan = plans.find((item) => item.code === subscription.planCode);
  return plan ? getPlanLabel(plan, t) : subscription.planCode ?? t.plans.defaultPlanFallback;
}

export function buildActiveSubscriptionBlockMessage(
  subscription: SubscriptionResponse,
  plans: CommercialPlanResponse[] = [],
  t: Messages,
  intlTag: string,
): string {
  const label = getActiveSubscriptionLabel(subscription, plans, t);
  const until = formatPaidUntil(subscription.paidUntil, intlTag);
  const untilText = until ? t.plans.activeSubscriptionUntil(until) : "";
  return t.plans.activeSubscriptionBlocked(label, untilText);
}

export function canPurchasePlan(
  subscriptions: SubscriptionResponse[],
  plans: CommercialPlanResponse[] = [],
  t: Messages,
  intlTag: string,
  now = Date.now(),
): PurchaseGuardResult {
  const activeSubscription = getActiveSubscription(subscriptions, now);
  if (!activeSubscription) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: buildActiveSubscriptionBlockMessage(activeSubscription, plans, t, intlTag),
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

export function buildPendingPaymentMessage(planCode: string, t: Messages): string {
  return t.plans.pendingPayment(planCode);
}
