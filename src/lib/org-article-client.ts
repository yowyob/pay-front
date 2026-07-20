import {
    buildArticleUrl,
    type OrgArticle,
} from "@/lib/direct-payment";

const ORG_ARTICLE_TIMEOUT_MS = 10_000;
const ORG_ARTICLE_MAX_BYTES = 256_000;

export class OrgArticleFetchError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OrgArticleFetchError";
    this.status = status;
  }
}

function parseOrgArticle(payload: unknown): OrgArticle {
  if (!payload || typeof payload !== "object") {
    throw new OrgArticleFetchError("Réponse article invalide", 502);
  }

  const data = payload as Record<string, unknown>;
  const articleId = String(data.articleId ?? "").trim();
  const organizationId = String(data.organizationId ?? "").trim();
  const label = String(data.label ?? "").trim();
  const unitAmount = Number(data.unitAmount);
  const currency = String(data.currency ?? "XAF").trim();
  const successWebhookUrl = String(data.successWebhookUrl ?? "").trim();
  const failureWebhookUrl = String(data.failureWebhookUrl ?? "").trim();

  if (!articleId || !organizationId || !label) {
    throw new OrgArticleFetchError(
      "Champs articleId, organizationId et label requis",
      502,
    );
  }
  if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
    throw new OrgArticleFetchError("unitAmount invalide", 502);
  }
  if (!successWebhookUrl || !failureWebhookUrl) {
    throw new OrgArticleFetchError(
      "successWebhookUrl et failureWebhookUrl requis",
      502,
    );
  }

  return {
    articleId,
    organizationId,
    label,
    description:
      typeof data.description === "string" ? data.description : undefined,
    unitAmount,
    currency,
    serviceCode:
      typeof data.serviceCode === "string" ? data.serviceCode : null,
    planCode: typeof data.planCode === "string" ? data.planCode : null,
    billingPeriod:
      data.billingPeriod === "MONTHLY" || data.billingPeriod === "YEARLY"
        ? data.billingPeriod
        : "MONTHLY",
    addOnCodes: Array.isArray(data.addOnCodes)
      ? data.addOnCodes.filter((item): item is string => typeof item === "string")
      : [],
    successWebhookUrl,
    failureWebhookUrl,
    metadata:
      data.metadata && typeof data.metadata === "object"
        ? (data.metadata as Record<string, unknown>)
        : undefined,
  };
}

export async function fetchOrgArticle(params: {
  apiBaseUrl: string;
  orgId: string;
  articleId: string;
  orgApiKey?: string;
}): Promise<OrgArticle> {
  const url = buildArticleUrl(params.apiBaseUrl, params.orgId, params.articleId);
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "YowYob-Payment/1.0",
    "X-Request-Id": crypto.randomUUID(),
  };

  if (params.orgApiKey) {
    headers["X-Api-Key"] = params.orgApiKey;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(ORG_ARTICLE_TIMEOUT_MS),
    });
  } catch {
    throw new OrgArticleFetchError(
      "Impossible de contacter l'API article de l'organisation",
      502,
    );
  }

  const raw = await response.text();
  if (raw.length > ORG_ARTICLE_MAX_BYTES) {
    throw new OrgArticleFetchError("Réponse article trop volumineuse", 502);
  }

  if (!response.ok) {
    throw new OrgArticleFetchError(
      response.status === 404
        ? "Article introuvable"
        : `API article a répondu ${response.status}`,
      response.status,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new OrgArticleFetchError("Réponse article non JSON", 502);
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    "data" in parsed &&
    (parsed as { data?: unknown }).data
  ) {
    return parseOrgArticle((parsed as { data: unknown }).data);
  }

  return parseOrgArticle(parsed);
}
