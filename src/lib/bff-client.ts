type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
};

export class BffError extends Error {
  status: number;
  errorCode?: string;

  constructor(message: string, status: number, errorCode?: string) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
  }
}

export async function bffFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | T
    | null;

  if (!response.ok) {
    const envelope = body as ApiEnvelope<T> | null;
    throw new BffError(
      envelope?.message ?? "Une erreur est survenue",
      response.status,
      envelope?.errorCode,
    );
  }

  if (body && typeof body === "object" && "data" in body) {
    return (body as ApiEnvelope<T>).data as T;
  }

  return body as T;
}

export async function bffPost<T>(path: string, payload?: unknown): Promise<T> {
  return bffFetch<T>(path, {
    method: "POST",
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
}

export async function bffGet<T>(path: string): Promise<T> {
  return bffFetch<T>(path, { method: "GET" });
}

export async function bffDelete<T>(path: string): Promise<T> {
  return bffFetch<T>(path, { method: "DELETE" });
}

export async function bffPostEnvelope<T>(
  path: string,
  payload?: unknown,
): Promise<{ success?: boolean; data?: T; message?: string; errorCode?: string }> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new BffError(
      body?.message ?? "Une erreur est survenue",
      response.status,
      body?.errorCode,
    );
  }
  return body;
}

export async function bffPut<T>(path: string, payload?: unknown): Promise<T> {
  return bffFetch<T>(path, {
    method: "PUT",
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
}
