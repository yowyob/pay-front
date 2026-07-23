import {
    DirectPaymentValidationError,
    parseDirectPaymentQuery,
} from "@/lib/direct-payment";
import { resolveDirectPaymentContext } from "@/lib/direct-payment-kernel";
import { OrgArticleFetchError } from "@/lib/org-article-client";
import { getSessionFromRequest } from "@/lib/session-cookies";
import { rechargeShortfall } from "@/lib/wallet-direct-payment";
import { NextResponse } from "next/server";

/**
 * Recharge le différentiel manquant pour un achat, puis renvoie l'URL du provider. Le montant est
 * recalculé côté serveur ; au retour, l'utilisateur revient sur la popup pour payer depuis son solde.
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
    const result = await rechargeShortfall(request, context, searchParams.toString());
    return NextResponse.json({ success: true, data: result });
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
          error instanceof Error ? error.message : "Erreur lors de la recharge",
      },
      { status: 500 },
    );
  }
}
