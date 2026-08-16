import { getIwmEnv } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/session-cookies";

/**
 * Client wallet robuste vers le kernel-core (payment-core). Principe d'une vraie API de paiement :
 * le front n'écrit JAMAIS le solde. Il crée un wallet, initie une recharge (redirection provider),
 * et c'est le kernel qui crédite le wallet — une seule fois, idempotent — à la confirmation
 * (callback provider ou refresh). Tout le monde est client : wallet personnel (owner = user courant,
 * déduit du Bearer) ou wallet d'organisation.
 *
 * Server-only : détient la clé client kernel, ne jamais importer côté navigateur.
 */

export type WalletDto = {
  id: string;
  ownerId: string;
  ownerType: "USER" | "ORGANIZATION";
  ownerName: string;
  balance: number;
  createdAt?: string;
  updatedAt?: string;
};

export type WalletRechargeDto = {
  orderId: string;
  walletId: string;
  paymentOrderId?: string;
  transactionId?: string;
  status: string;
  amount: number;
  currency: string;
  redirectUrl?: string;
  providerReference?: string;
};

export type WalletTransactionDto = {
  id: string;
  walletId: string;
  amount: number;
  type: string;
  status: string;
  reference?: string;
  createdAt?: string;
};

function headers(request: Request): Record<string, string> {
  const { clientId, apiKey } = getIwmEnv();
  const session = getSessionFromRequest(request);
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Client-Id": clientId,
    "X-Api-Key": apiKey,
  };
  if (session.tenantId) h["X-Tenant-Id"] = session.tenantId;
  if (session.organizationId) h["X-Organization-Id"] = session.organizationId;
  if (session.authorization) h.Authorization = session.authorization;
  return h;
}

function unwrap<T>(payload: unknown): T | undefined {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data?: T }).data;
  }
  return payload as T | undefined;
}

async function call<T>(
  request: Request,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data?: T; message?: string }> {
  const { baseUrl } = getIwmEnv();
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: headers(request),
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  let json: unknown = undefined;
  try {
    json = await response.json();
  } catch {
    json = undefined;
  }
  const message =
    json && typeof json === "object" && "message" in json
      ? String((json as { message?: unknown }).message ?? "")
      : undefined;
  return {
    ok: response.ok,
    status: response.status,
    data: unwrap<T>(json),
    message,
  };
}

/** Wallet personnel de l'utilisateur courant (créé si absent). Owner déduit du Bearer côté kernel. */
export function ensureMyWallet(request: Request, ownerName?: string) {
  return call<WalletDto>(request, "POST", "/api/payments/wallets/mine", {
    ownerName: ownerName ?? null,
  });
}

export function getMyWallet(request: Request) {
  return call<WalletDto>(request, "GET", "/api/payments/wallets/mine");
}

/** Wallet d'une organisation (créé si absent). */
export function ensureOrgWallet(
  request: Request,
  organizationId: string,
  ownerName?: string,
) {
  return call<WalletDto>(request, "POST", "/api/payments/wallets", {
    ownerId: organizationId,
    ownerType: "ORGANIZATION",
    ownerName: ownerName ?? `org:${organizationId}`,
  });
}

/**
 * Initie une recharge : crée l'ordre + le paiement provider, renvoie l'URL de redirection.
 * Le kernel crédite le wallet à la confirmation — jamais le front.
 */
export function rechargeWallet(
  request: Request,
  walletId: string,
  input: {
    amount: number;
    currency?: string;
    provider?: string;
    method?: string;
    payerReference?: string;
    idempotencyKey: string;
  },
) {
  return call<WalletRechargeDto>(
    request,
    "POST",
    `/api/payments/wallets/${encodeURIComponent(walletId)}/recharge`,
    {
      amount: input.amount,
      currency: input.currency ?? "XAF",
      provider: input.provider ?? "MYCOOLPAY",
      method: input.method ?? "MOBILE_MONEY",
      payerReference: input.payerReference ?? null,
      idempotencyKey: input.idempotencyKey,
    },
  );
}

/** Confirme l'ordre de recharge (poll provider). Crédite le wallet côté kernel si SUCCESS. */
export function refreshRecharge(request: Request, orderId: string) {
  return call<WalletRechargeDto>(
    request,
    "POST",
    `/api/payments/wallets/recharge-orders/${encodeURIComponent(orderId)}/refresh`,
  );
}

/** Historique des mouvements (ledger append-only) du wallet. */
export function walletTransactions(request: Request, walletId: string) {
  return call<WalletTransactionDto[]>(
    request,
    "GET",
    `/api/payments/wallets/${encodeURIComponent(walletId)}/transactions`,
  );
}
