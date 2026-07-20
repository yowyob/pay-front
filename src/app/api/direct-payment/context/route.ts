import {
    DirectPaymentValidationError,
    parseDirectPaymentQuery,
} from "@/lib/direct-payment";
import { resolveDirectPaymentContext } from "@/lib/direct-payment-kernel";
import { OrgArticleFetchError } from "@/lib/org-article-client";
import { getSessionFromRequest } from "@/lib/session-cookies";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
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

    return NextResponse.json({
      success: true,
      data: {
        userId: params.userId,
        orgId: params.orgId,
        articleId: params.articleId,
        mode: params.mode,
        quantity: params.qte,
        reference: params.reference,
        returnUrl: params.returnUrl,
        label: context.article.label,
        description: context.article.description,
        unitAmount: context.unitAmount,
        totalAmount: context.totalAmount,
        currency: context.currency,
        checkoutType: context.checkoutType,
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
      { message: "Erreur lors de la résolution de l'article" },
      { status: 500 },
    );
  }
}
