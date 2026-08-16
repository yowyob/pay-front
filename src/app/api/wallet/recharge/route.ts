import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSessionFromRequest } from "@/lib/session-cookies";
import {
  ensureMyWallet,
  ensureOrgWallet,
  rechargeWallet,
} from "@/lib/wallet-kernel";

type RechargeBody = {
  scope?: "personal" | "org";
  organizationId?: string;
  amount?: number;
  currency?: string;
  payerReference?: string;
  idempotencyKey?: string;
};

/**
 * Recharge robuste : résout (ou crée) le wallet cible (perso ou org), initie la recharge kernel
 * et renvoie l'URL de redirection provider. Le crédit se fait côté kernel à la confirmation.
 */
export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session.authorization) {
    return NextResponse.json(
      { message: "Authentification requise", errorCode: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  let body: RechargeBody;
  try {
    body = (await request.json()) as RechargeBody;
  } catch {
    return NextResponse.json(
      { message: "Corps JSON invalide", errorCode: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { message: "Montant invalide", errorCode: "INVALID_AMOUNT" },
      { status: 400 },
    );
  }

  const scope = body.scope === "org" ? "org" : "personal";
  const walletResult =
    scope === "org"
      ? await ensureOrgWallet(
          request,
          body.organizationId ?? session.organizationId ?? "",
        )
      : await ensureMyWallet(request);
  if (!walletResult.ok || !walletResult.data?.id) {
    return NextResponse.json(
      { message: walletResult.message || "Wallet cible indisponible", errorCode: "WALLET_ERROR" },
      { status: walletResult.status || 502 },
    );
  }

  const recharge = await rechargeWallet(request, walletResult.data.id, {
    amount,
    currency: body.currency,
    payerReference: body.payerReference,
    idempotencyKey: body.idempotencyKey || randomUUID(),
  });
  if (!recharge.ok || !recharge.data) {
    return NextResponse.json(
      { message: recharge.message || "Initiation de la recharge échouée", errorCode: "RECHARGE_ERROR" },
      { status: recharge.status || 502 },
    );
  }

  return NextResponse.json({
    walletId: walletResult.data.id,
    orderId: recharge.data.orderId,
    status: recharge.data.status,
    redirectUrl: recharge.data.redirectUrl ?? null,
    amount: recharge.data.amount,
    currency: recharge.data.currency,
  });
}
