import { createIwmPaymentClient } from "@/lib/iwm-payment-client";
import { getSessionFromRequest } from "@/lib/session-cookies";
import { getAppOrigin, type DirectPaymentContext } from "@/lib/direct-payment";
import { getIwmEnv } from "@/lib/env";
import type { components } from "@/types/schemas-payment";

type WalletResponse = components["schemas"]["WalletResponse"];

type ApiEnvelope<T> = { success?: boolean; data?: T; message?: string; errorCode?: string };

function unwrap<T>(payload: unknown): T | undefined {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T | undefined;
}

function messageOf(payload: unknown, fallback: string): string {
  return unwrap<ApiEnvelope<unknown>>(payload)?.message ?? fallback;
}

/**
 * Identité du PAYEUR : c'est le wallet de l'utilisateur connecté qui est débité, jamais celui passé
 * dans l'URL par la plateforme appelante. Seul l'actorId issu de la session serveur est fiable.
 */
function resolvePayerOwnerId(request: Request): string {
  const actorId = getSessionFromRequest(request).actorId;
  if (!actorId) {
    throw new Error(
      "Contexte payeur absent : sélectionnez d'abord un contexte utilisateur valide.",
    );
  }
  return actorId;
}

/** Wallet du payeur, avec son solde. */
export async function resolvePayerWallet(
  request: Request,
): Promise<{ walletId: string; balance: number }> {
  const ownerId = resolvePayerOwnerId(request);
  const client = createIwmPaymentClient(request);
  const result = await client.GET("/api/payments/wallets/owner/{ownerId}", {
    params: { path: { ownerId } },
  });
  const wallet = unwrap<WalletResponse>(result.data ?? result.error);
  if (!result.response.ok || !wallet?.id) {
    throw new Error(messageOf(result.error, "Portefeuille introuvable pour ce compte."));
  }
  return { walletId: wallet.id, balance: wallet.balance ?? 0 };
}

export type WalletPaymentDecision =
  | { status: "paid"; walletId: string; reference: string; amount: number; currency: string }
  | {
      status: "insufficient";
      walletId: string;
      balance: number;
      total: number;
      shortfall: number;
      currency: string;
    };

/**
 * Règle centrale : le paiement se fait AVEC LE CONTENU DU WALLET.
 *
 * Si le solde couvre le total, on débite le wallet directement (opération synchrone et atomique).
 * Sinon, on ne débite rien : on renvoie le MONTANT MANQUANT exact, à recharger d'abord. Aucun
 * paiement partiel, aucun recours à OM/MOMO/Stripe pour l'achat lui-même.
 */
export async function payArticleFromWallet(
  request: Request,
  context: DirectPaymentContext,
  reference: string,
): Promise<WalletPaymentDecision> {
  const { walletId, balance } = await resolvePayerWallet(request);
  const total = context.totalAmount;
  const currency = context.currency;

  if (balance < total) {
    return {
      status: "insufficient",
      walletId,
      balance,
      total,
      // Arrondi défensif : on ne demande jamais de recharger moins que le manque réel.
      shortfall: Math.max(0, Math.ceil(total - balance)),
      currency,
    };
  }

  const client = createIwmPaymentClient(request);
  const result = await client.POST("/api/payments/wallets/{walletId}/pay", {
    params: { path: { walletId } },
    body: { amount: total, reference },
  });
  if (!result.response.ok) {
    throw new Error(messageOf(result.error, "Échec du paiement depuis le portefeuille."));
  }
  return { status: "paid", walletId, reference, amount: total, currency };
}

/**
 * Recharge le MANQUE exact pour couvrir l'achat, via le provider (c'est l'argent qui entre dans le
 * portefeuille). Le montant est recalculé ici, jamais accepté du client. Au retour du provider,
 * l'utilisateur revient sur la popup et paie enfin depuis son solde reconstitué.
 */
export async function rechargeShortfall(
  request: Request,
  context: DirectPaymentContext,
  resumeQuery: string,
): Promise<{ redirectUrl: string; orderId?: string; amount: number }> {
  const { walletId, balance } = await resolvePayerWallet(request);
  const shortfall = Math.max(0, Math.ceil(context.totalAmount - balance));
  if (shortfall <= 0) {
    // Le solde est en réalité suffisant : rien à recharger, on renvoie sur la popup pour payer.
    return { redirectUrl: `${getAppOrigin(request)}/direct-payment?${resumeQuery}`, amount: 0 };
  }

  const { clientId, payerReference } = getIwmEnv();
  const origin = getAppOrigin(request);
  const resumeUrl = `${origin}/direct-payment?${resumeQuery}`;
  const client = createIwmPaymentClient(request);
  const result = await client.POST("/api/payments/wallets/{walletId}/recharge", {
    params: { path: { walletId } },
    body: {
      amount: shortfall,
      currency: context.currency,
      clientId,
      provider: "MYCOOLPAY",
      method: "MOBILE_MONEY",
      payerReference,
      // Retour sur la popup dans les deux cas : elle re-vérifie le solde et propose de payer.
      callbackUrl: resumeUrl,
      failureCallbackUrl: resumeUrl,
    },
  });
  const recharge = unwrap<components["schemas"]["WalletRechargeResponse"]>(
    result.data ?? result.error,
  );
  if (!result.response.ok || !recharge?.redirectUrl) {
    throw new Error(messageOf(result.error, "Échec du lancement de la recharge."));
  }
  return { redirectUrl: recharge.redirectUrl, orderId: recharge.orderId, amount: shortfall };
}
