import { createIwmPaymentClient } from "@/lib/iwm-payment-client";
import {
    fromCommercialPlanOrder,
    fromPaymentOrder,
    fromServiceBundleOrder,
    fromWalletRechargeOrder,
    fromWalletTransaction,
    sortActivityItems,
    unwrapApiList,
    type PaymentActivityItem,
} from "@/lib/payment-activity";
import { getSessionFromRequest } from "@/lib/session-cookies";
import type { components } from "@/types/schemas-payment";
import { NextResponse } from "next/server";

type ApiResponseListTransactionResponse =
  components["schemas"]["ApiResponseListTransactionResponse"];
type ApiResponseListWalletRechargeResponse =
  components["schemas"]["ApiResponseListWalletRechargeResponse"];
type ApiResponseListPaymentOrderResponse =
  components["schemas"]["ApiResponseListPaymentOrderResponse"];
type ApiResponseListCommercialPlanOrderResponse =
  components["schemas"]["ApiResponseListCommercialPlanOrderResponse"];
type ApiResponseListServiceBundleOrderResponse =
  components["schemas"]["ApiResponseListServiceBundleOrderResponse"];

const DEFAULT_LIMIT = 50;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const walletId = searchParams.get("walletId");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : DEFAULT_LIMIT;

  if (!walletId) {
    return NextResponse.json({ message: "walletId requis" }, { status: 400 });
  }

  const session = getSessionFromRequest(request);
  const client = createIwmPaymentClient(request);
  const queryLimit =
    limit !== undefined && !Number.isNaN(limit) ? { limit } : undefined;

  const [
    walletTransactionsResult,
    rechargeOrdersResult,
    paymentOrdersResult,
    planOrdersResult,
    bundleOrdersResult,
  ] = await Promise.allSettled([
    client.GET("/api/payments/wallets/{walletId}/transactions", {
      params: { path: { walletId } },
    }),
    client.GET("/api/payments/wallets/{walletId}/recharge-orders", {
      params: {
        path: { walletId },
        query: queryLimit,
      },
    }),
    client.GET("/api/payments/orders", {
      params: { query: queryLimit },
    }),
    client.GET("/api/commercial-plans/orders", {
      params: { query: queryLimit },
    }),
    client.GET("/api/service-bundles/orders", {
      params: { query: queryLimit },
    }),
  ]);

  const activity: PaymentActivityItem[] = [];

  if (walletTransactionsResult.status === "fulfilled") {
    const payload = walletTransactionsResult.value.data as
      | ApiResponseListTransactionResponse
      | undefined;
    for (const transaction of unwrapApiList(payload)) {
      const item = fromWalletTransaction(transaction);
      if (item) {
        activity.push(item);
      }
    }
  }

  if (rechargeOrdersResult.status === "fulfilled") {
    const payload = rechargeOrdersResult.value.data as
      | ApiResponseListWalletRechargeResponse
      | undefined;
    for (const order of unwrapApiList(payload)) {
      const item = fromWalletRechargeOrder(order);
      if (item) {
        activity.push(item);
      }
    }
  }

  if (paymentOrdersResult.status === "fulfilled") {
    const payload = paymentOrdersResult.value.data as
      | ApiResponseListPaymentOrderResponse
      | undefined;
    for (const order of unwrapApiList(payload)) {
      const item = fromPaymentOrder(order);
      if (item) {
        activity.push(item);
      }
    }
  }

  if (planOrdersResult.status === "fulfilled") {
    const payload = planOrdersResult.value.data as
      | ApiResponseListCommercialPlanOrderResponse
      | undefined;
    for (const order of unwrapApiList(payload)) {
      const item = fromCommercialPlanOrder(order, session.organizationId);
      if (item) {
        activity.push(item);
      }
    }
  }

  if (bundleOrdersResult.status === "fulfilled") {
    const payload = bundleOrdersResult.value.data as
      | ApiResponseListServiceBundleOrderResponse
      | undefined;
    for (const order of unwrapApiList(payload)) {
      const item = fromServiceBundleOrder(order, session.organizationId);
      if (item) {
        activity.push(item);
      }
    }
  }

  const sorted = sortActivityItems(activity);
  const data = Number.isNaN(limit) ? sorted : sorted.slice(0, limit);

  return NextResponse.json({
    success: true,
    data,
  });
}
