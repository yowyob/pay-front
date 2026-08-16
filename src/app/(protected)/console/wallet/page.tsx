"use client";

import { useState } from "react";
import { useConsoleData } from "@/components/console/console-data-provider";
import { TransactionList } from "@/components/console/transaction-list";
import { bffPost } from "@/lib/bff-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type RechargeResponse = {
  walletId: string;
  orderId: string;
  status: string;
  redirectUrl: string | null;
  amount: number;
  currency: string;
};

export default function WalletPage() {
  const { wallet, walletLoading } = useConsoleData();
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const balance = Number(wallet?.balance ?? 0);
  const ownerType = (wallet as { ownerType?: string } | null)?.ownerType ?? "USER";

  async function recharge() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Entrez un montant valide.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const result = await bffPost<RechargeResponse>("/api/wallet/recharge", {
        scope: "personal",
        amount: value,
      });
      if (result.redirectUrl) {
        // Redirection vers le provider : le kernel créditera le wallet à la confirmation.
        window.location.href = result.redirectUrl;
        return;
      }
      setInfo(
        `Recharge initiée (statut ${result.status}). Le solde sera crédité après confirmation du paiement.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recharge impossible pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="yypay:mb-8">
        <h1 className="yypay:text-2xl yypay:font-bold yypay:text-foreground sm:yypay:text-3xl">
          Mon wallet
        </h1>
        <p className="yypay:mt-2 yypay:text-muted-foreground">
          Rechargez votre porte-monnaie. Le crédit est appliqué par le système après confirmation
          du paiement — jamais avant.
        </p>
      </div>

      <Card className="yypay:mb-6 yypay:p-6">
        <div className="yypay:flex yypay:flex-wrap yypay:items-end yypay:justify-between yypay:gap-4">
          <div>
            <div className="yypay:text-sm yypay:text-muted-foreground">
              Solde ({ownerType === "ORGANIZATION" ? "organisation" : "personnel"})
            </div>
            <div className="yypay:text-3xl yypay:font-bold yypay:text-foreground">
              {walletLoading ? "…" : `${balance.toLocaleString()} XAF`}
            </div>
            {wallet?.ownerName ? (
              <div className="yypay:mt-1 yypay:text-xs yypay:text-muted-foreground">
                {wallet.ownerName}
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <Card className="yypay:mb-8 yypay:p-6">
        <h2 className="yypay:mb-4 yypay:text-lg yypay:font-semibold yypay:text-foreground">
          Recharger
        </h2>
        {error ? (
          <div className="yypay:mb-3 yypay:rounded-md yypay:bg-destructive/15 yypay:p-3 yypay:text-sm yypay:text-destructive">
            {error}
          </div>
        ) : null}
        {info ? (
          <div className="yypay:mb-3 yypay:rounded-md yypay:bg-emerald-500/15 yypay:p-3 yypay:text-sm yypay:text-emerald-600">
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
            placeholder="Montant (XAF)"
            className="yypay:max-w-48"
          />
          <Button onClick={recharge} disabled={submitting}>
            {submitting ? "Redirection…" : "Recharger"}
          </Button>
        </div>
      </Card>

      <div className="yypay:mb-4">
        <h2 className="yypay:text-lg yypay:font-semibold yypay:text-foreground">Historique</h2>
      </div>
      <TransactionList walletId={wallet?.id} walletName={wallet?.ownerName} />
    </>
  );
}
