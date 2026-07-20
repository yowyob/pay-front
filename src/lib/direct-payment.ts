export type DirectPaymentMode = "for_org" | "of_org";

export type DirectPaymentCheckoutType = "plan" | "bundle" | "payment";

export type DirectPaymentQueryParams = {
  userId: string;
  articleId: string;
  orgId: string;
  qte: number;
  mode: DirectPaymentMode;
  apiBaseUrl: string;
  returnUrl?: string;
  reference?: string;
  orgApiKey?: string;
};

export type OrgArticle = {
  articleId: string;
  organizationId: string;
  label: string;
  description?: string;
  unitAmount: number;
  currency: string;
  serviceCode?: string | null;
  planCode?: string | null;
  billingPeriod?: "MONTHLY" | "YEARLY";
  addOnCodes?: string[];
  successWebhookUrl: string;
  failureWebhookUrl: string;
  metadata?: Record<string, unknown>;
};

export type DirectPaymentContext = {
  params: DirectPaymentQueryParams;
  article: OrgArticle;
  unitAmount: number;
  totalAmount: number;
  currency: string;
  checkoutType: DirectPaymentCheckoutType;
};

export type DirectPaymentSession = {
  orderId: string;
  orderType: DirectPaymentCheckoutType;
  paymentOrderId?: string;
  mode: DirectPaymentMode;
  orgId: string;
  articleId: string;
  userId: string;
  reference?: string;
  returnUrl?: string;
  quantity: number;
  amount: number;
  currency: string;
  label: string;
  successWebhookUrl: string;
  failureWebhookUrl: string;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class DirectPaymentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectPaymentValidationError";
  }
}

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function parseDirectPaymentMode(
  value: string | null | undefined,
): DirectPaymentMode | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "for_org" || normalized === "of_org") {
    return normalized;
  }
  return null;
}

function parsePositiveInteger(
  value: string | null | undefined,
  fieldName: string,
): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new DirectPaymentValidationError(
      `${fieldName} doit être un entier strictement positif`,
    );
  }
  return parsed;
}

function parseOptionalUrl(
  value: string | null | undefined,
  fieldName: string,
): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new DirectPaymentValidationError(
        `${fieldName} doit utiliser http ou https`,
      );
    }
    return url.toString();
  } catch (error) {
    if (error instanceof DirectPaymentValidationError) {
      throw error;
    }
    throw new DirectPaymentValidationError(`${fieldName} invalide`);
  }
}

function parseApiBaseUrl(value: string | null | undefined): string {
  if (!value?.trim()) {
    throw new DirectPaymentValidationError("apiBaseUrl est requis");
  }
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new DirectPaymentValidationError(
        "apiBaseUrl doit utiliser http ou https",
      );
    }
    return url.toString().replace(/\/$/, "");
  } catch (error) {
    if (error instanceof DirectPaymentValidationError) {
      throw error;
    }
    throw new DirectPaymentValidationError("apiBaseUrl invalide");
  }
}

export function parseDirectPaymentQuery(
  searchParams: URLSearchParams,
): DirectPaymentQueryParams {
  const userId = searchParams.get("userId")?.trim();
  const articleId = searchParams.get("articleId")?.trim();
  const orgId = searchParams.get("orgId")?.trim();
  const mode = parseDirectPaymentMode(searchParams.get("mode"));
  const apiBaseUrl = parseApiBaseUrl(searchParams.get("apiBaseUrl"));
  const qte = parsePositiveInteger(searchParams.get("qte"), "qte");

  if (!userId) {
    throw new DirectPaymentValidationError("userId est requis");
  }
  if (!articleId) {
    throw new DirectPaymentValidationError("articleId est requis");
  }
  if (!orgId || !isUuid(orgId)) {
    throw new DirectPaymentValidationError("orgId doit être un UUID valide");
  }
  if (!mode) {
    throw new DirectPaymentValidationError(
      "mode doit valoir for_org ou of_org",
    );
  }

  return {
    userId,
    articleId,
    orgId,
    qte,
    mode,
    apiBaseUrl,
    returnUrl: parseOptionalUrl(searchParams.get("returnUrl"), "returnUrl"),
    reference: searchParams.get("reference")?.trim() || undefined,
    orgApiKey: searchParams.get("orgApiKey")?.trim() || undefined,
  };
}

export function buildArticleUrl(
  apiBaseUrl: string,
  orgId: string,
  articleId: string,
): string {
  const base = apiBaseUrl.replace(/\/$/, "");
  return `${base}/${encodeURIComponent(orgId)}/${encodeURIComponent(articleId)}`;
}

export function resolveCheckoutType(
  mode: DirectPaymentMode,
  article: OrgArticle,
): DirectPaymentCheckoutType {
  if (mode === "of_org") {
    return "payment";
  }
  if (article.planCode?.trim()) {
    return "plan";
  }
  if (article.serviceCode?.trim()) {
    return "bundle";
  }
  return "payment";
}

export function buildIdempotencyKey(params: {
  orgId: string;
  articleId: string;
  reference?: string;
}): string {
  const ref = params.reference?.trim() || `ts-${Date.now()}`;
  return `direct-${params.orgId}-${params.articleId}-${ref}`;
}

export function buildDirectPaymentContext(
  params: DirectPaymentQueryParams,
  article: OrgArticle,
): DirectPaymentContext {
  if (article.organizationId !== params.orgId) {
    throw new DirectPaymentValidationError(
      "L'article ne correspond pas à l'organisation demandée",
    );
  }
  if (article.articleId !== params.articleId) {
    throw new DirectPaymentValidationError(
      "L'identifiant article ne correspond pas",
    );
  }
  if (!Number.isFinite(article.unitAmount) || article.unitAmount <= 0) {
    throw new DirectPaymentValidationError("unitAmount invalide");
  }

  const currency = article.currency?.trim() || "XAF";
  const totalAmount = article.unitAmount * params.qte;

  return {
    params,
    article,
    unitAmount: article.unitAmount,
    totalAmount,
    currency,
    checkoutType: resolveCheckoutType(params.mode, article),
  };
}

export function getAppOrigin(request: Request): string {
  const fromEnv = process.env.APP_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return new URL(request.url).origin;
}

export function isPaymentSuccessStatus(status?: string | null): boolean {
  const normalized = status?.trim().toUpperCase();
  return (
    normalized === "SUCCESS" ||
    normalized === "SUCCESSFUL" ||
    normalized === "COMPLETED" ||
    normalized === "PAID" ||
    normalized === "ACTIVE" ||
    normalized === "RECHARGED"
  );
}

export function isPaymentFailureStatus(status?: string | null): boolean {
  const normalized = status?.trim().toUpperCase();
  return (
    normalized === "FAILED" ||
    normalized === "FAILURE" ||
    normalized === "CANCELLED" ||
    normalized === "CANCELED" ||
    normalized === "REJECTED"
  );
}
