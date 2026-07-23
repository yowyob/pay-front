import {
    buildIdempotencyKey,
    DirectPaymentValidationError,
    parseDirectPaymentQuery,
} from "@/lib/direct-payment";
import { resolveDirectPaymentContext } from "@/lib/direct-payment-kernel";
import { OrgArticleFetchError } from "@/lib/org-article-client";
import { getSessionFromRequest } from "@/lib/session-cookies";
import { payArticleFromWallet } from "@/lib/wallet-direct-payment";
import { NextResponse } from "next/server";

/**
 * Paiement d'un article DEPUIS LE PORTEFEUILLE.
 *
 * Réponse :
 *  - `status: "paid"` → le wallet a été débité, l'achat est réglé ;
 *  - `status: "insufficient"` → rien n'a été débité, on renvoie le montant manquant à recharger.
 */
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
    const reference =
      params.reference ??
      buildIdempotencyKey({
        orgId: params.orgId,
        articleId: params.articleId,
        reference: params.reference,
      });

    const decision = await payArticleFromWallet(request, context, reference);
    return NextResponse.json({
      success: true,
      data: {
        ...decision,
        label: context.article.label,
        orgId: params.orgId,
        articleId: params.articleId,
        userId: params.userId,
        returnUrl: params.returnUrl,
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
            : "Erreur lors du paiement depuis le portefeuille",
      },
      { status: 500 },
    );
  }
}
