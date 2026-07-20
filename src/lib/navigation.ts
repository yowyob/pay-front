export function createIdempotencyKey(prefix = "cart"): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function redirectToUrl(url: string): void {
  globalThis.location.assign(url);
}
