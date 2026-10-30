"use client";

import { useState } from "react";
import { useConsoleData } from "@/components/console/console-data-provider";
import {
  MoneyTransferCard,
  type TransferSource,
} from "@/components/console/money-transfer-card";
import { MoneyWithdrawalCard } from "@/components/console/money-withdrawal-card";
import { TransactionList } from "@/components/console/transaction-list";
import { useLocale } from "@/i18n/locale-provider";
import { toIntlTag } from "@/i18n/format";
import { bffPost } from "@/lib/bff-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Copy } from "lucide-react";
import { toast } from "sonner";

type RechargeResponse = {
  walletId: string;
  orderId: string;
  status: string;
  redirectUrl: string | null;
  amount: number;
  currency: string;
};

/**
 * Identifiant à communiquer pour recevoir un transfert. Il n'était affiché nulle part : le
 * formulaire de transfert demandait l'identifiant du destinataire sans que personne puisse
 * connaître le sien.
 */
function WalletIdentifier({ walletId }: { walletId: string }) {
  const { t } = useLocale();

  async function copy() {
    try {
      await navigator.clipboard.writeText(walletId);
      toast.success(t.walletOps.copied);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé) : l'identifiant reste sélectionnable.
    }
  }

  return (
    <div className="yypay:mt-3 yypay:space-y-1">
      <div className="yypay:text-xs yypay:text-muted-foreground">{t.walletOps.walletId}</div>
      <div className="yypay:flex yypay:flex-wrap yypay:items-center yypay:gap-2">
        <code className="yypay:break-all yypay:rounded yypay:bg-muted yypay:px-2 yypay:py-1 yypay:text-xs yypay:text-foreground">
          {walletId}
        </code>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          <Copy className="yypay:h-3.5 yypay:w-3.5" aria-hidden="true" />
          {t.walletOps.copy}
        </Button>
      </div>
      <p className="yypay:text-xs yypay:text-muted-foreground">{t.walletOps.walletIdHint}</p>
    </div>
  );
}

export default function WalletPage() {
  const { wallet, personalWallet, sessionContext, walletLoading, refreshWallet } =
    useConsoleData();
  const { t, locale } = useLocale();
  const intlTag = toIntlTag(locale);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const organizationId = sessionContext?.organizationId ?? null;
  const balance = Number(wallet?.balance ?? 0);
  const formatAmount = (value: number) => `${value.toLocaleString(intlTag)} XAF`;

  const transferSources: TransferSource[] = [
    ...(wallet?.id
      ? [
          {
            id: wallet.id,
            label: organizationId
              ? t.walletOps.sourceOrganization
              : t.walletOps.sourcePersonal,
          },
        ]
      : []),
    ...(personalWallet?.id
      ? [{ id: personalWallet.id, label: t.walletOps.sourcePersonal }]
      : []),
  ];

  async function recharge() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError(t.walletOps.invalidAmount);
      return;
    }
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      // Le portefeuille rechargé est celui qu'on affiche : celui de l'organisation active, qui
      // paie ses achats (créé à la première recharge s'il n'existe pas encore).
      const result = await bffPost<RechargeResponse>("/api/wallet/recharge", {
        scope: organizationId ? "org" : "personal",
        organizationId: organizationId ?? undefined,
        amount: value,
      });
      if (result.redirectUrl) {
        // Redirection vers le provider : le kernel créditera le wallet à la confirmation.
        window.location.href = result.redirectUrl;
        return;
      }
      setInfo(t.walletOps.rechargeInitiated(result.status));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.walletOps.rechargeError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="yypay:mb-8">
        <h1 className="yypay:text-2xl yypay:font-bold yypay:text-foreground yypay:sm:text-3xl">
          {t.walletOps.title}
        </h1>
        <p className="yypay:mt-2 yypay:text-muted-foreground">{t.walletOps.description}</p>
      </div>

      <div className="yypay:mb-6 yypay:grid yypay:grid-cols-1 yypay:gap-6 yypay:lg:grid-cols-2">
        <Card className="yypay:p-6">
          <div className="yypay:text-sm yypay:text-muted-foreground">
            {organizationId ? t.walletOps.balanceOrganization : t.walletOps.balancePersonal}
          </div>
          <div className="yypay:text-3xl yypay:font-bold yypay:text-foreground">
            {walletLoading ? "…" : formatAmount(balance)}
          </div>
          {wallet?.id ? (
            <WalletIdentifier walletId={wallet.id} />
          ) : !walletLoading ? (
            <p className="yypay:mt-2 yypay:text-sm yypay:text-muted-foreground">
              {t.walletOps.noOrganizationWallet}
            </p>
          ) : null}
        </Card>

        {personalWallet?.id ? (
          <Card className="yypay:p-6">
            <div className="yypay:text-sm yypay:text-muted-foreground">
              {t.walletOps.personalTitle}
            </div>
            <div className="yypay:text-2xl yypay:font-semibold yypay:text-foreground">
              {formatAmount(Number(personalWallet.balance ?? 0))}
            </div>
            <WalletIdentifier walletId={personalWallet.id} />
            <p className="yypay:mt-2 yypay:text-xs yypay:text-muted-foreground">
              {t.walletOps.personalHint}
            </p>
          </Card>
        ) : null}
      </div>

      <Card className="yypay:mb-8 yypay:p-6">
        <h2 className="yypay:mb-4 yypay:text-lg yypay:font-semibold yypay:text-foreground">
          {t.walletOps.rechargeTitle}
        </h2>
        {error ? (
          <div
            role="alert"
            className="yypay:mb-3 yypay:rounded-md yypay:bg-destructive/15 yypay:p-3 yypay:text-sm yypay:text-destructive"
          >
            {error}
          </div>
        ) : null}
        {info ? (
          <div
            role="status"
            className="yypay:mb-3 yypay:rounded-md yypay:bg-emerald-500/15 yypay:p-3 yypay:text-sm yypay:text-emerald-600"
          >
            {info}
          </div>
        ) : null}
        <div className="yypay:flex yypay:flex-wrap yypay:items-center yypay:gap-3">
          <Input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t.walletOps.amountPlaceholder}
            aria-label={t.walletOps.amountPlaceholder}
            className="yypay:max-w-48"
          />
          <Button onClick={recharge} disabled={submitting}>
            {submitting ? t.walletOps.redirecting : t.walletOps.rechargeCta}
          </Button>
        </div>
      </Card>

      <div className="yypay:mb-8 yypay:grid yypay:grid-cols-1 yypay:gap-6 yypay:lg:grid-cols-2">
        <MoneyTransferCard sources={transferSources} onDone={refreshWallet} />
        <MoneyWithdrawalCard walletId={wallet?.id} onDone={refreshWallet} />
      </div>

      <div className="yypay:mb-4">
        <h2 className="yypay:text-lg yypay:font-semibold yypay:text-foreground">
          {t.walletOps.history}
        </h2>
      </div>
      <TransactionList walletId={wallet?.id} walletName={wallet?.ownerName} />
    </>
  );
}
