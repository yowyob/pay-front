import { createIwmPaymentClient } from "@/lib/iwm-payment-client";
import {
    fromCommercialPlanOrder,
    fromServiceBundleOrder,
    fromWalletRechargeOrder,
    fromWalletTransaction,
    sortActivityItems,
    unwrapApiList,
    withoutDuplicateRechargeCredits,
    type PaymentActivityItem,
} from "@/lib/payment-activity";
import { getSessionFromRequest } from "@/lib/session-cookies";
import type { components } from "@/types/schemas-payment";
import { NextResponse } from "next/server";

type ApiResponseListTransactionResponse =
  components["schemas"]["ApiResponseListTransactionResponse"];
type ApiResponseListWalletRechargeResponse =
  components["schemas"]["ApiResponseListWalletRechargeResponse"];
type ApiResponseListCommercialPlanOrderResponse =
  components["schemas"]["ApiResponseListCommercialPlanOrderResponse"];
type ApiResponseListServiceBundleOrderResponse =
  components["schemas"]["ApiResponseListServiceBundleOrderResponse"];

const DEFAULT_LIMIT = 50;
// Les transactions du portefeuille ne portent pas de devise : le portefeuille est tenu en XAF
// (même hypothèse que la carte du solde et la page du portefeuille).
const WALLET_CURRENCY = "XAF";

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
      const item = fromWalletTransaction(transaction, WALLET_CURRENCY);
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

  // Les ordres de paiement des APPLICATIONS (GET /api/payments/orders) n'appartiennent à aucun
  // portefeuille : ils montraient à chacun les paiements de tout le tenant (« Payment Billing » des
  // autres comptes). L'activité d'un portefeuille = ses transactions, ses recharges, et les
  // commandes de plans et de packs de l'organisation active (bornées par le noyau).
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

  const sorted = sortActivityItems(withoutDuplicateRechargeCredits(activity));
  const data = Number.isNaN(limit) ? sorted : sorted.slice(0, limit);

  return NextResponse.json({
    success: true,
    data,
  });
}
