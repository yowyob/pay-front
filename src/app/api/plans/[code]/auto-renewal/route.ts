import { asJsonBody, readJsonBody, toBffResponse } from "@/lib/bff-utils";
import { getIwmEnv } from "@/lib/env";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";
import { getSessionFromRequest } from "@/lib/session-cookies";
import type { components } from "@/types/schemas-payment";

type AutoRenewalRequest = components["schemas"]["AutoRenewalRequest"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: planCode } = await params;
  const body = await readJsonBody<AutoRenewalRequest>(request);
  const { clientId, payerReference } = getIwmEnv();
  const session = getSessionFromRequest(request);
  const client = createIwmPaymentClient(request);
  const result = await client.POST("/api/plans/{planCode}/auto-renewal", {
    params: { path: { planCode } },
    body: {
      ...asJsonBody(body),
      clientId: body?.clientId ?? clientId,
      payerReference: body?.payerReference ?? payerReference,
      organizationId: body?.organizationId ?? session.organizationId,
    },
  });
  return toBffResponse(result);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: planCode } = await params;
  const { searchParams } = new URL(request.url);
  const session = getSessionFromRequest(request);
  const organizationId =
    searchParams.get("organizationId") ?? session.organizationId;

  if (!organizationId) {
    return toBffResponse({
      data: undefined,
      error: { message: "organizationId requis", errorCode: "MISSING_ORGANIZATION" },
      response: new Response(null, { status: 400 }),
    });
  }

  const client = createIwmPaymentClient(request);
  const result = await client.DELETE("/api/plans/{planCode}/auto-renewal", {
    params: {
      path: { planCode },
      query: { organizationId },
    },
  });
  return toBffResponse(result);
}
