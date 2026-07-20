export function formatMycoolpayLabel(walletName?: string | null) {
  const trimmed = walletName?.trim();
  if (trimmed) {
    return `MYCOOLPAY - ${trimmed}`;
  }
  return "MYCOOLPAY";
}

export function formatPaymentDescription(
  context: string,
  walletName?: string | null,
) {
  const trimmed = walletName?.trim();
  if (trimmed) {
    return `${context} - ${trimmed}`;
  }
  return context;
}

export function buildWalletRechargeDescription(
  walletName?: string | null,
): string {
  const trimmed = walletName?.trim();
  if (trimmed) {
    return `Recharge wallet - ${trimmed}`;
  }
  return "Recharge wallet";
}
