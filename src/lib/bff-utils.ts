import { NextResponse } from "next/server";

type FetchResult = {
  data?: unknown;
  error?: unknown;
  response: Response;
};

export function toBffResponse({ data, error, response }: FetchResult) {
  const body = data ?? error ?? null;
  return NextResponse.json(body, { status: response.status });
}

export async function readJsonBody<T>(request: Request): Promise<T | undefined> {
  const text = await request.text();
  if (!text.trim()) {
    return undefined;
  }
  return JSON.parse(text) as T;
}

export function asJsonBody<T>(body: T | undefined): T {
  return (body ?? {}) as T;
}
