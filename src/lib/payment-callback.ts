export type PaymentReturnStatus = "success" | "failure" | "cancelled";

export function parsePaymentReturn(
  value: string | null | undefined,
): PaymentReturnStatus | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === "success") {
    return "success";
  }
  if (
    normalized === "failure" ||
    normalized === "failed" ||
    normalized === "fail" ||
    normalized === "error"
  ) {
    return "failure";
  }
  if (
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "cancel"
  ) {
    return "cancelled";
  }
  return null;
}

function deriveFailureCallbackUrl(successUrl?: string): string | undefined {
  if (!successUrl?.trim()) {
    return undefined;
  }
  try {
    const url = new URL(successUrl);
    url.searchParams.set("payment", "failure");
    return url.toString();
  } catch {
    return undefined;
  }
}

export function getPaymentSuccessCallbackUrl(
  override?: string,
): string | undefined {
  const value = override ?? process.env.PAYMENT_CALLBACK_URL;
  return value?.trim() || undefined;
}

export function getPaymentFailureCallbackUrl(
  override?: string,
): string | undefined {
  const explicit = override ?? process.env.PAYMENT_FAILURE_CALLBACK_URL;
  if (explicit?.trim()) {
    return explicit.trim();
  }
  return deriveFailureCallbackUrl(process.env.PAYMENT_CALLBACK_URL);
}

export function getDirectPaymentSuccessCallbackUrl(
  override?: string,
): string | undefined {
  const value = override ?? process.env.PAYMENT_DIRECT_SUCCESS_CALLBACK_URL;
  return value?.trim() || undefined;
}

export function getDirectPaymentFailureCallbackUrl(
  override?: string,
): string | undefined {
  const explicit = override ?? process.env.PAYMENT_DIRECT_FAILURE_CALLBACK_URL;
  if (explicit?.trim()) {
    return explicit.trim();
  }
  return deriveFailureCallbackUrl(
    process.env.PAYMENT_DIRECT_SUCCESS_CALLBACK_URL ??
      process.env.PAYMENT_CALLBACK_URL,
  );
}

type PaymentCallbackBody = {
  callbackUrl?: string;
  failureCallbackUrl?: string;
};

export function withPaymentCallbacks<T extends PaymentCallbackBody>(
  body: T | undefined,
): T {
  const next = { ...(body ?? {}) } as T;
  if (!next.callbackUrl) {
    next.callbackUrl = getPaymentSuccessCallbackUrl();
  }
  if (!next.failureCallbackUrl) {
    next.failureCallbackUrl = getPaymentFailureCallbackUrl();
  }
  return next;
}

export function withDirectPaymentCallbacks<T extends PaymentCallbackBody>(
  body: T | undefined,
): T {
  const next = { ...(body ?? {}) } as T;
  if (!next.callbackUrl) {
    next.callbackUrl = getDirectPaymentSuccessCallbackUrl();
  }
  if (!next.failureCallbackUrl) {
    next.failureCallbackUrl = getDirectPaymentFailureCallbackUrl();
  }
  return next;
}
