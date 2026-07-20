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

export function getActivityStatusVariant(
  status?: string,
): "success" | "secondary" | "default" {
  const normalized = status?.trim().toUpperCase() ?? "";
  if (SUCCESS_STATUSES.has(normalized)) {
    return "success";
  }
  if (PENDING_STATUSES.has(normalized)) {
    return "secondary";
  }
  if (FAILED_STATUSES.has(normalized)) {
    return "default";
  }
  return "secondary";
}

export function formatActivityType(item: PaymentActivityItem): string {
  switch (item.source) {
    case "wallet":
      return item.type;
    case "recharge_order":
      return "Recharge wallet";
    case "payment_order":
      return `Paiement ${item.type}`;
    case "plan_order":
      return item.type.startsWith("PLAN_")
        ? `Plan ${item.type.slice(5)}`
        : `Plan ${item.type}`;
    case "bundle_order":
      return "Bundle services";
    default: {
      const exhaustive: never = item.source;
      return exhaustive;
    }
  }
}

export function formatActivityAmount(item: PaymentActivityItem): string {
  if (item.amount == null) {
    return "-";
  }
  const formatted = item.amount.toLocaleString("fr-FR");
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
