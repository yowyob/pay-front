import {
    DirectPaymentValidationError,
    parseDirectPaymentQuery,
} from "@/lib/direct-payment";
import {
    initiateDirectPaymentCheckout,
    resolveDirectPaymentContext,
} from "@/lib/direct-payment-kernel";
import { OrgArticleFetchError } from "@/lib/org-article-client";
import { getSessionFromRequest } from "@/lib/session-cookies";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session.authorization) {
    return NextResponse.json(
      { message: "Authentification requise", errorCode: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const params = parseDirectPaymentQuery(searchParams);
    const context = await resolveDirectPaymentContext(params);
    const checkout = await initiateDirectPaymentCheckout(request, context);

    return NextResponse.json({
      success: true,
      data: {
        orderId: checkout.orderId,
        orderType: checkout.orderType,
        paymentOrderId: checkout.paymentOrderId,
        redirectUrl: checkout.redirectUrl,
        session: {
          orderId: checkout.orderId,
          orderType: checkout.orderType,
          paymentOrderId: checkout.paymentOrderId,
          mode: checkout.mode,
          orgId: checkout.orgId,
          articleId: checkout.articleId,
          userId: checkout.userId,
          reference: checkout.reference,
          returnUrl: checkout.returnUrl,
          quantity: checkout.quantity,
          amount: checkout.amount,
          currency: checkout.currency,
          label: checkout.label,
          successWebhookUrl: checkout.successWebhookUrl,
          failureWebhookUrl: checkout.failureWebhookUrl,
        },
      },
    });
  } catch (error) {
    if (error instanceof DirectPaymentValidationError) {
      return NextResponse.json(
        { message: error.message, errorCode: "INVALID_PARAMS" },
        { status: 400 },
      );
    }
    if (error instanceof OrgArticleFetchError) {
      return NextResponse.json(
        { message: error.message, errorCode: "ARTICLE_FETCH_FAILED" },
        { status: error.status >= 400 && error.status < 600 ? error.status : 502 },
      );
    }
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'initiation du paiement",
      },
      { status: 500 },
    );
  }
}
