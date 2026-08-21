import { parseDirectPaymentQuery } from "@/lib/direct-payment";
import { resolveDirectPaymentContext } from "@/lib/direct-payment-kernel";
import { getSessionFromRequest } from "@/lib/session-cookies";
import { ensureMyWallet, walletPay, walletPayChallenge } from "@/lib/wallet-kernel";
import { notifyOrgWebhook } from "@/lib/org-webhook-notifier";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session.authorization) {
    return NextResponse.json({ message: "Authentification requise", errorCode: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const params = parseDirectPaymentQuery(searchParams);
    if (params.mode !== "for_org") {
      return NextResponse.json({ message: "Le wallet personnel est requis pour ce parcours.", errorCode: "INVALID_MODE" }, { status: 400 });
    }
    const context = await resolveDirectPaymentContext(params);
    const wallet = await ensureMyWallet(request, "my-wallet");
    if (!wallet.ok || !wallet.data?.id) {
      return NextResponse.json({ message: wallet.message ?? "Wallet indisponible", errorCode: "WALLET_ERROR" }, { status: wallet.status || 502 });
    }
    const body = (await request.json().catch(() => ({}))) as {
      action?: "challenge" | "confirm";
      challengeToken?: string;
      code?: string;
    };
    const reference = context.params.reference ?? `DIRECT-${context.params.articleId}-${Date.now()}`;
    if (body.action !== "confirm") {
      const challenge = await walletPayChallenge(request, wallet.data.id, { amount: context.totalAmount, reference });
      if (!challenge.ok || !challenge.data?.challengeToken) {
        return NextResponse.json({ message: challenge.message ?? "Impossible d'envoyer le code MFA", errorCode: "MFA_CHALLENGE_FAILED" }, { status: challenge.status || 502 });
      }
      return NextResponse.json({ challenge: challenge.data, wallet: wallet.data, amount: context.totalAmount, currency: context.currency, reference });
    }
    if (!body.challengeToken || !body.code) {
      return NextResponse.json({ message: "Le challenge MFA et le code sont requis", errorCode: "MFA_REQUIRED" }, { status: 400 });
    }
    const payment = await walletPay(request, wallet.data.id, {
      amount: context.totalAmount,
      reference,
      challengeToken: body.challengeToken,
      code: body.code,
    });
    if (!payment.ok) {
      return NextResponse.json({ message: payment.message ?? "Paiement wallet refusé", errorCode: "WALLET_PAYMENT_FAILED" }, { status: payment.status || 502 });
    }
    const payload = {
      event: "payment.success" as const,
      paymentOrderId: payment.data?.id,
      orderId: payment.data?.id,
      organizationId: context.params.orgId,
      articleId: context.params.articleId,
      userId: context.params.userId,
      mode: context.params.mode,
      amount: context.totalAmount,
      currency: context.currency,
      quantity: context.params.qte,
      reference,
      status: "SUCCEEDED",
      occurredAt: new Date().toISOString(),
    };
    try { await notifyOrgWebhook(context.article.successWebhookUrl, payload); } catch { /* payment is already committed */ }
    return NextResponse.json({ success: true, status: "SUCCEEDED", transaction: payment.data, reference });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Paiement wallet impossible", errorCode: "WALLET_PAYMENT_FAILED" }, { status: 400 });
  }
}
