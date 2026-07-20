import {
    buildDirectPaymentContext,
    buildIdempotencyKey,
    type DirectPaymentCheckoutType,
    type DirectPaymentContext,
    type DirectPaymentQueryParams,
    type DirectPaymentSession,
    getAppOrigin,
    isPaymentSuccessStatus,
} from "@/lib/direct-payment";
import { getIwmEnv } from "@/lib/env";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";
import { fetchOrgArticle } from "@/lib/org-article-client";
import {
    notifyOrgWebhook,
    type OrgWebhookPayload,
} from "@/lib/org-webhook-notifier";
import {
    getDirectPaymentFailureCallbackUrl,
    getDirectPaymentSuccessCallbackUrl,
} from "@/lib/payment-callback";
import { getSessionFromRequest } from "@/lib/session-cookies";
import type { components } from "@/types/schemas-payment";

type CommercialPlanCheckoutRequest =
  components["schemas"]["CommercialPlanCheckoutRequest"];
type ServiceBundleCheckoutRequest =
  components["schemas"]["ServiceBundleCheckoutRequest"];
type InitiatePaymentRequest = components["schemas"]["InitiatePaymentRequest"];
type CommercialPlanCheckoutResponse =
  components["schemas"]["CommercialPlanCheckoutResponse"];
type ServiceBundleCheckoutResponse =
  components["schemas"]["ServiceBundleCheckoutResponse"];
type PaymentOrderResponse = components["schemas"]["PaymentOrderResponse"];
type WalletResponse = components["schemas"]["WalletResponse"];

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
};

function unwrapApiData<T>(payload: unknown): T | undefined {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T | undefined;
}

export async function resolveDirectPaymentContext(
  params: DirectPaymentQueryParams,
): Promise<DirectPaymentContext> {
  const article = await fetchOrgArticle({
    apiBaseUrl: params.apiBaseUrl,
    orgId: params.orgId,
    articleId: params.articleId,
    orgApiKey: params.orgApiKey,
  });
  return buildDirectPaymentContext(params, article);
}

export async function initiateDirectPaymentCheckout(
  request: Request,
  context: DirectPaymentContext,
): Promise<DirectPaymentSession & { redirectUrl?: string }> {
  const { clientId, payerReference } = getIwmEnv();
  const client = createIwmPaymentClient(request);
  const origin = getAppOrigin(request);
  const callbacks = {
    callbackUrl:
      getDirectPaymentSuccessCallbackUrl() ??
      `${origin}/direct-payment/return?payment=success`,
    failureCallbackUrl:
      getDirectPaymentFailureCallbackUrl() ??
      `${origin}/direct-payment/return?payment=failure`,
  };
  const idempotencyKey = buildIdempotencyKey({
    orgId: context.params.orgId,
    articleId: context.params.articleId,
    reference: context.params.reference,
  });

  if (context.checkoutType === "plan" && context.article.planCode) {
    const body: CommercialPlanCheckoutRequest = {
      organizationId: context.params.orgId,
      addOnCodes: context.article.addOnCodes ?? [],
      billingPeriod: context.article.billingPeriod ?? "MONTHLY",
      clientId,
      provider: "MYCOOLPAY",
      method: "MOBILE_MONEY",
      payerReference,
      idempotencyKey,
      ...callbacks,
    };
    const result = await client.POST("/api/plans/{planCode}/checkout", {
      params: { path: { planCode: context.article.planCode } },
      body,
    });
    const data = unwrapApiData<CommercialPlanCheckoutResponse>(
      result.data ?? result.error,
    );
    if (!result.response.ok || !data?.orderId) {
      throw new Error(
        unwrapApiData<ApiEnvelope<unknown>>(result.error)?.message ??
          "Échec du checkout plan",
      );
    }
    return {
      orderId: data.orderId,
      orderType: "plan",
      paymentOrderId: data.paymentOrderId,
      redirectUrl: data.redirectUrl,
      mode: context.params.mode,
      orgId: context.params.orgId,
      articleId: context.params.articleId,
      userId: context.params.userId,
      reference: context.params.reference,
      returnUrl: context.params.returnUrl,
      quantity: context.params.qte,
      amount: context.totalAmount,
      currency: context.currency,
      label: context.article.label,
      successWebhookUrl: context.article.successWebhookUrl,
      failureWebhookUrl: context.article.failureWebhookUrl,
    };
  }

  if (context.checkoutType === "bundle" && context.article.serviceCode) {
    const body: ServiceBundleCheckoutRequest = {
      organizationId: context.params.orgId,
      services: [context.article.serviceCode],
      billingPeriod: context.article.billingPeriod ?? "MONTHLY",
      clientId,
      provider: "MYCOOLPAY",
      method: "MOBILE_MONEY",
      payerReference,
      idempotencyKey,
      ...callbacks,
    };
    const result = await client.POST("/api/service-bundles/checkout", { body });
    const data = unwrapApiData<ServiceBundleCheckoutResponse>(
      result.data ?? result.error,
    );
    if (!result.response.ok || !data?.orderId) {
      throw new Error(
        unwrapApiData<ApiEnvelope<unknown>>(result.error)?.message ??
          "Échec du checkout bundle",
      );
    }
    return {
      orderId: data.orderId,
      orderType: "bundle",
      paymentOrderId: data.paymentOrderId,
      redirectUrl: data.redirectUrl,
      mode: context.params.mode,
      orgId: context.params.orgId,
      articleId: context.params.articleId,
      userId: context.params.userId,
      reference: context.params.reference,
      returnUrl: context.params.returnUrl,
      quantity: context.params.qte,
      amount: context.totalAmount,
      currency: context.currency,
      label: context.article.label,
      successWebhookUrl: context.article.successWebhookUrl,
      failureWebhookUrl: context.article.failureWebhookUrl,
    };
  }

  const serviceCode =
    context.article.serviceCode?.trim() ||
    context.article.planCode?.trim() ||
    "DIRECT_PAYMENT";
  const body: InitiatePaymentRequest = {
    clientId,
    serviceCode,
    idempotencyKey,
    amount: context.totalAmount,
    currency: context.currency,
    provider: "MYCOOLPAY",
    method: "MOBILE_MONEY",
    payerReference,
    description: `${context.article.label} x${context.params.qte}`,
    ...callbacks,
  };
  const result = await client.POST("/api/payments/orders", { body });
  const data = unwrapApiData<PaymentOrderResponse>(result.data ?? result.error);
  if (!result.response.ok || !data?.id) {
    throw new Error(
      unwrapApiData<ApiEnvelope<unknown>>(result.error)?.message ??
        "Échec de l'initiation du paiement",
    );
  }
  return {
    orderId: data.id,
    orderType: "payment",
    paymentOrderId: data.id,
    redirectUrl: data.redirectUrl,
    mode: context.params.mode,
    orgId: context.params.orgId,
    articleId: context.params.articleId,
    userId: context.params.userId,
    reference: context.params.reference,
    returnUrl: context.params.returnUrl,
    quantity: context.params.qte,
    amount: context.totalAmount,
    currency: context.currency,
    label: context.article.label,
    successWebhookUrl: context.article.successWebhookUrl,
    failureWebhookUrl: context.article.failureWebhookUrl,
  };
}

async function refreshDirectPaymentOrder(
  request: Request,
  orderType: DirectPaymentCheckoutType,
  orderId: string,
): Promise<{ status?: string; paymentOrderId?: string }> {
  const client = createIwmPaymentClient(request);

  if (orderType === "plan") {
    const result = await client.POST(
      "/api/commercial-plans/orders/{orderId}/refresh",
      { params: { path: { orderId } } },
    );
    const data = unwrapApiData<{ status?: string; paymentOrderId?: string }>(
      result.data ?? result.error,
    );
    return { status: data?.status, paymentOrderId: data?.paymentOrderId };
  }

  if (orderType === "bundle") {
    const result = await client.POST(
      "/api/service-bundles/orders/{orderId}/refresh",
      { params: { path: { orderId } } },
    );
    const data = unwrapApiData<{ status?: string; paymentOrderId?: string }>(
      result.data ?? result.error,
    );
    return { status: data?.status, paymentOrderId: data?.paymentOrderId };
  }

  const result = await client.POST("/api/payments/orders/{id}/refresh", {
    params: { path: { id: orderId } },
  });
  const data = unwrapApiData<PaymentOrderResponse>(result.data ?? result.error);
  return { status: data?.status, paymentOrderId: data?.id };
}

async function ensureOrganizationWallet(
  request: Request,
  organizationId: string,
  ownerName: string,
): Promise<WalletResponse> {
  const client = createIwmPaymentClient(request);
  const existing = await client.GET("/api/payments/wallets/owner/{ownerId}", {
    params: { path: { ownerId: organizationId } },
  });
  const existingWallet = unwrapApiData<WalletResponse>(
    existing.data ?? existing.error,
  );
  if (existing.response.ok && existingWallet?.id) {
    return existingWallet;
  }

  const created = await client.POST("/api/payments/wallets", {
    body: { ownerId: organizationId, ownerName },
  });
  const wallet = unwrapApiData<WalletResponse>(created.data ?? created.error);
  if (!created.response.ok || !wallet?.id) {
    throw new Error("Impossible de créer le wallet organisation");
  }
  return wallet;
}

async function creditOrganizationWallet(
  request: Request,
  walletId: string,
  amount: number,
  reference: string,
): Promise<{ credited: boolean; message?: string }> {
  const { baseUrl, clientId, apiKey } = getIwmEnv();
  const session = getSessionFromRequest(request);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Client-Id": clientId,
    "X-Api-Key": apiKey,
  };

  if (session.tenantId) {
    headers["X-Tenant-Id"] = session.tenantId;
  }

  if (session.authorization) {
    headers.Authorization = session.authorization;
  }

  const response = await fetch(
    `${baseUrl}/api/payments/wallets/${encodeURIComponent(walletId)}/credit`,
    {
      method: "POST",
      headers: {
        ...headers,
      },
      body: JSON.stringify({ amount, reference }),
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (response.ok) {
    return { credited: true };
  }

  return {
    credited: false,
    message:
      "Crédit wallet organisation indisponible côté Kernel — notification webhook uniquement",
  };
}

export type DirectPaymentFinalizeResult = {
  status: string;
  success: boolean;
  paymentOrderId?: string;
  orgWalletCredited?: boolean;
  orgWalletMessage?: string;
};

export async function finalizeDirectPayment(
  request: Request,
  session: DirectPaymentSession,
  paymentReturn: "success" | "failure" | "cancelled",
): Promise<DirectPaymentFinalizeResult> {
  let status = paymentReturn.toUpperCase();
  let paymentOrderId = session.paymentOrderId;

  if (paymentReturn === "success") {
    const refreshed = await refreshDirectPaymentOrder(
      request,
      session.orderType,
      session.orderId,
    );
    status = refreshed.status ?? status;
    paymentOrderId = refreshed.paymentOrderId ?? paymentOrderId;
  } else if (paymentReturn === "failure") {
    status = "FAILED";
  } else {
    status = "CANCELLED";
  }

  const success = isPaymentSuccessStatus(status);

  let orgWalletCredited: boolean | undefined;
  let orgWalletMessage: string | undefined;

  if (success && session.mode === "of_org") {
    const wallet = await ensureOrganizationWallet(
      request,
      session.orgId,
      session.label,
    );
    const creditResult = await creditOrganizationWallet(
      request,
      wallet.id!,
      session.amount,
      session.reference ?? session.orderId,
    );
    orgWalletCredited = creditResult.credited;
    orgWalletMessage = creditResult.message;
  }

  const webhookPayload: OrgWebhookPayload = {
    event: success ? "payment.success" : "payment.failure",
    paymentOrderId,
    orderId: session.orderId,
    organizationId: session.orgId,
    articleId: session.articleId,
    userId: session.userId,
    mode: session.mode,
    amount: session.amount,
    currency: session.currency,
    quantity: session.quantity,
    reference: session.reference,
    status,
    occurredAt: new Date().toISOString(),
    metadata: orgWalletMessage ? { orgWalletMessage } : undefined,
  };

  const webhookUrl = success
    ? session.successWebhookUrl
    : session.failureWebhookUrl;

  try {
    await notifyOrgWebhook(webhookUrl, webhookPayload);
  } catch {
    // Le paiement reste finalisé même si le webhook org échoue.
  }

  return {
    status,
    success,
    paymentOrderId,
    orgWalletCredited,
    orgWalletMessage,
  };
}
