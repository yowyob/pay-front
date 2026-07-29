import type { Messages } from "@/i18n/messages/fr";
import type { components } from "@/types/schemas-payment";

type TransactionResponse = components["schemas"]["TransactionResponse"];
type WalletRechargeResponse = components["schemas"]["WalletRechargeResponse"];
type PaymentOrderResponse = components["schemas"]["PaymentOrderResponse"];
type CommercialPlanOrderResponse =
  components["schemas"]["CommercialPlanOrderResponse"];
type ServiceBundleOrderResponse =
  components["schemas"]["ServiceBundleOrderResponse"];

export type PaymentActivitySource =
  | "wallet"
  | "recharge_order"
  | "payment_order"
  | "plan_order"
  | "bundle_order";

export type PaymentActivityItem = {
  id: string;
  source: PaymentActivitySource;
  type: string;
  status: string;
  amount?: number;
  currency?: string;
  reference?: string;
  detail?: string;
  createdAt?: string;
};

const SUCCESS_STATUSES = new Set([
  "SUCCESS",
  "SUCCESSFUL",
  "COMPLETED",
  "PAID",
  "ACTIVE",
  "RECHARGED",
]);

const PENDING_STATUSES = new Set([
  "PENDING",
  "PENDING_PAYMENT",
  "PROCESSING",
]);

const FAILED_STATUSES = new Set([
  "FAILED",
  "CANCELLED",
  "CANCELED",
  "REJECTED",
  "EXPIRED",
]);

export type ActivityStatusGroup = "success" | "pending" | "failed" | "other";

export function getActivityStatusGroup(status?: string): ActivityStatusGroup {
  const normalized = status?.trim().toUpperCase() ?? "";
  if (SUCCESS_STATUSES.has(normalized)) {
    return "success";
  }
  if (PENDING_STATUSES.has(normalized)) {
    return "pending";
  }
  if (FAILED_STATUSES.has(normalized)) {
    return "failed";
  }
  return "other";
}

export function getActivityStatusVariant(
  status?: string,
): "success" | "secondary" | "destructive" {
  switch (getActivityStatusGroup(status)) {
    case "success":
      return "success";
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
}

const STATUS_LABEL_KEYS: Record<
  string,
  keyof Messages["transactionList"]["statusLabels"]
> = {
  SUCCESS: "success",
  SUCCESSFUL: "success",
  COMPLETED: "success",
  PAID: "success",
  ACTIVE: "active",
  RECHARGED: "recharged",
  PENDING: "pending",
  PENDING_PAYMENT: "pending",
  PROCESSING: "processing",
  FAILED: "failed",
  CANCELLED: "cancelled",
  CANCELED: "cancelled",
  REJECTED: "rejected",
  EXPIRED: "expired",
};

export function formatActivityStatusLabel(
  status: string | undefined,
  t: Messages,
): string {
  const normalized = status?.trim().toUpperCase() ?? "";
  const key = STATUS_LABEL_KEYS[normalized];
  return key ? t.transactionList.statusLabels[key] : status ?? t.transactionList.statusLabels.unknown;
}

export function formatActivityType(item: PaymentActivityItem, t: Messages): string {
  switch (item.source) {
    case "wallet":
      return item.type;
    case "recharge_order":
      return t.transactionList.types.rechargeWallet;
    case "payment_order":
      return t.transactionList.types.payment(item.type);
    case "plan_order":
      return t.transactionList.types.plan(
        item.type.startsWith("PLAN_") ? item.type.slice(5) : item.type,
      );
    case "bundle_order":
      return t.transactionList.types.bundleServices;
    default: {
      const exhaustive: never = item.source;
      return exhaustive;
    }
  }
}

export function formatActivityAmount(
  item: PaymentActivityItem,
  intlTag: string,
): string {
  if (item.amount == null) {
    return "-";
  }
  const formatted = item.amount.toLocaleString(intlTag);
  return item.currency ? `${formatted} ${item.currency}` : formatted;
}

function toTimestamp(value?: string): number {
  if (!value) {
    return 0;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

export function sortActivityItems(items: PaymentActivityItem[]): PaymentActivityItem[] {
  return [...items].sort(
    (left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt),
  );
}

export function fromWalletTransaction(
  transaction: TransactionResponse,
): PaymentActivityItem | null {
  if (!transaction.id) {
    return null;
  }

  return {
    id: `wallet-tx-${transaction.id}`,
    source: "wallet",
    type: transaction.type ?? "TRANSACTION",
    status: transaction.status ?? "UNKNOWN",
    amount: transaction.amount,
    reference: transaction.reference,
    createdAt: transaction.createdAt,
  };
}

export function fromWalletRechargeOrder(
  order: WalletRechargeResponse,
): PaymentActivityItem | null {
  if (!order.orderId) {
    return null;
  }

  return {
    id: `recharge-${order.orderId}`,
    source: "recharge_order",
    type: "RECHARGE_WALLET",
    status: order.status ?? "UNKNOWN",
    amount: order.amount,
    currency: order.currency,
    reference: order.providerReference ?? order.paymentOrderId,
    detail: order.transactionId
      ? `Transaction wallet ${order.transactionId}`
      : "Paiement provider",
    createdAt: order.createdAt ?? order.updatedAt,
  };
}

export function fromPaymentOrder(
  order: PaymentOrderResponse,
): PaymentActivityItem | null {
  if (!order.id) {
    return null;
  }

  const providerLabel = [order.provider, order.method]
    .filter(Boolean)
    .join(" / ");

  return {
    id: `payment-${order.id}`,
    source: "payment_order",
    type: order.serviceCode ?? "PAYMENT",
    status: order.status ?? "UNKNOWN",
    amount: order.amount,
    currency: order.currency,
    reference: order.providerReference ?? order.id,
    detail: providerLabel || undefined,
    createdAt: order.createdAt ?? order.updatedAt,
  };
}

export function fromCommercialPlanOrder(
  order: CommercialPlanOrderResponse,
  organizationId?: string,
): PaymentActivityItem | null {
  if (!order.id) {
    return null;
  }
  if (organizationId && order.organizationId && order.organizationId !== organizationId) {
    return null;
  }

  const addOns = order.addOnCodes?.length
    ? `Add-ons: ${order.addOnCodes.join(", ")}`
    : undefined;

  return {
    id: `plan-${order.id}`,
    source: "plan_order",
    type: order.planCode ? `PLAN_${order.planCode}` : "PLAN",
    status: order.status ?? "UNKNOWN",
    amount: order.amount,
    currency: order.currency,
    reference: order.paymentOrderId,
    detail: addOns,
    createdAt: order.createdAt ?? order.updatedAt,
  };
}

export function fromServiceBundleOrder(
  order: ServiceBundleOrderResponse,
  organizationId?: string,
): PaymentActivityItem | null {
  if (!order.id) {
    return null;
  }
  if (organizationId && order.organizationId && order.organizationId !== organizationId) {
    return null;
  }

  return {
    id: `bundle-${order.id}`,
    source: "bundle_order",
    type: "SERVICE_BUNDLE",
    status: order.status ?? "UNKNOWN",
    amount: order.amount,
    currency: order.currency,
    reference: order.paymentOrderId,
    detail: order.services?.length
      ? order.services.join(", ")
      : undefined,
    createdAt: order.createdAt ?? order.updatedAt,
  };
}

export function unwrapApiList<T>(payload: { data?: T[] } | undefined): T[] {
  return Array.isArray(payload?.data) ? payload.data : [];
}
