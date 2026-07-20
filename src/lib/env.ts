function requireEnv(value: string | undefined, name: string): string {
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export function getIwmEnv() {
  return {
    baseUrl: requireEnv(process.env.IWM_API_BASE_URL, "IWM_API_BASE_URL"),
    clientId: requireEnv(process.env.IWM_CLIENT_ID, "IWM_CLIENT_ID"),
    apiKey: requireEnv(process.env.IWM_API_KEY, "IWM_API_KEY"),
    tenantId: requireEnv(process.env.IWM_TENANT_ID, "IWM_TENANT_ID"),
    payerReference: requireEnv(
      process.env.PAYMENT_PAYER_REFERENCE,
      "PAYMENT_PAYER_REFERENCE",
    ),
  };
}
