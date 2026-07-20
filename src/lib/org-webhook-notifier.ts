import type { DirectPaymentMode } from "@/lib/direct-payment";

export type OrgWebhookEvent = "payment.success" | "payment.failure";

export type OrgWebhookPayload = {
  event: OrgWebhookEvent;
  paymentOrderId?: string;
  orderId: string;
  organizationId: string;
  articleId: string;
  userId: string;
  mode: DirectPaymentMode;
  amount: number;
  currency: string;
  quantity: number;
  reference?: string;
  status: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

const WEBHOOK_TIMEOUT_MS = 10_000;

export async function notifyOrgWebhook(
  url: string,
  payload: OrgWebhookPayload,
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "YowYob-Payment/1.0",
      "X-YyPay-Event": payload.event,
      "X-YyPay-Delivery-Id": crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Webhook org a répondu ${response.status}`);
  }
}
