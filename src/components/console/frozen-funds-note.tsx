"use client";

import { useLocale } from "@/i18n/locale-provider";
import { bffGet } from "@/lib/bff-client";
import { Lock } from "lucide-react";
import { useEffect, useState } from "react";

type Hold = {
  id: string;
  remainingAmount: number;
  status: "ACTIVE" | "CLOSED";
  expiresAt?: string | null;
  expiryAction?: "RELEASE" | "REFUND" | null;
  createdAt: string;
};

type WalletHolds = { frozenAmount: number; holds: Hold[] };

/**
 * Fonds gelés d'un portefeuille : reçus pour un achat payé à l'avance, ils sont dans le solde mais
 * ne peuvent pas être utilisés tant que la plateforme qui a vendu ne les a pas dégelés. Rien n'est
 * affiché s'il n'y en a pas, ni si le noyau ne connaît pas encore les gels.
 */
export function FrozenFundsNote({
  walletId,
  balance,
  formatAmount,
}: {
  walletId: string;
  balance: number;
  formatAmount: (value: number) => string;
}) {
  const { t, locale } = useLocale();
  const [data, setData] = useState<WalletHolds | null>(null);

  // Relu quand le solde change : un dégel ou un renvoi le fait bouger.
  useEffect(() => {
    let cancelled = false;
    bffGet<WalletHolds>(`/api/payments/wallets/${encodeURIComponent(walletId)}/holds`)
      .then((result) => {
        if (!cancelled) setData(result ?? null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [walletId, balance]);

  const frozen = Number(data?.frozenAmount ?? 0);
  if (!data || frozen <= 0) return null;

  const active = data.holds.filter((hold) => hold.status === "ACTIVE");
  const date = (value: string) =>
    new Date(value).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="yypay:mt-3 yypay:space-y-2 yypay:rounded-lg yypay:border yypay:border-border yypay:bg-muted/40 yypay:p-3">
      <p className="yypay:flex yypay:items-center yypay:gap-2 yypay:text-sm yypay:text-foreground">
        <Lock className="yypay:h-4 yypay:w-4 yypay:shrink-0" aria-hidden="true" />
        {t.walletOps.frozenSummary(formatAmount(frozen), formatAmount(Math.max(0, balance - frozen)))}
      </p>
      <p className="yypay:text-xs yypay:text-muted-foreground">{t.walletOps.frozenHint}</p>
      {active.length > 0 ? (
        <ul className="yypay:space-y-1 yypay:text-xs yypay:text-muted-foreground">
          {active.map((hold) => (
            <li key={hold.id}>
              {t.walletOps.frozenLine(formatAmount(Number(hold.remainingAmount)), date(hold.createdAt))}
              {hold.expiresAt && hold.expiryAction
                ? ` · ${
                    hold.expiryAction === "REFUND"
                      ? t.walletOps.frozenRefundOn(date(hold.expiresAt))
                      : t.walletOps.frozenReleaseOn(date(hold.expiresAt))
                  }`
                : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
