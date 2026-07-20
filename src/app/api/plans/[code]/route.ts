import { readJsonBody, toBffResponse } from "@/lib/bff-utils";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";
import type { components } from "@/types/schemas-payment";

type SavePlanRequest = components["schemas"]["SavePlanRequest"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const client = createIwmPaymentClient(request);
  const result = await client.GET("/api/plans/{code}", {
    params: { path: { code } },
  });
  return toBffResponse(result);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = await readJsonBody<SavePlanRequest>(request);
  const client = createIwmPaymentClient(request);
  const result = await client.PUT("/api/plans/{code}", {
    params: { path: { code } },
    body: body ?? {},
  });
  return toBffResponse(result);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const client = createIwmPaymentClient(request);
  const result = await client.DELETE("/api/plans/{code}", {
    params: { path: { code } },
  });
  return toBffResponse(result);
}
