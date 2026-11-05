import { withBasePath } from "@/lib/base-path";

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

function resolveBffPath(path: string): string {
  return withBasePath(path);
}

let refreshInFlight: Promise<boolean> | null = null;

/** Un seul rafraîchissement à la fois, partagé par les appels qui reçoivent un 401 ensemble. */
function refreshSessionOnce(): Promise<boolean> {
  refreshInFlight ??= fetch(resolveBffPath("/api/auth/refresh"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

/**
 * Le jeton d'accès vit 15 min et n'était rafraîchi qu'à intervalle fixe depuis le chargement de
 * la page : un appel pouvait partir avec un jeton échu (la caisse restait bloquée sur « Acheter »).
 * Sur un 401, on rafraîchit la session puis on rejoue l'appel une fois.
 */
async function fetchWithRefresh(path: string, init: RequestInit): Promise<Response> {
  const response = await fetch(path, init);
  if (response.status !== 401 || path.includes("/api/auth/")) {
    return response;
  }
  return (await refreshSessionOnce()) ? fetch(path, init) : response;
}

export async function bffFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const resolvedPath = resolveBffPath(path);
  const response = await fetchWithRefresh(resolvedPath, {
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
  const resolvedPath = resolveBffPath(path);
  const response = await fetchWithRefresh(resolvedPath, {
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
