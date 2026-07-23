"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { bffFetch } from "@/lib/bff-client";
import { DIRECT_WALLET_COMPLETION_STORAGE_KEY } from "@/lib/bundle-constants";
import { CreditCard, Loader2, ShoppingBag, Wallet } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type DirectPaymentContextResponse = {
  userId: string;
  orgId: string;
  articleId: string;
  mode: "for_org" | "of_org";
  quantity: number;
  reference?: string;
  returnUrl?: string;
  label: string;
  description?: string;
  unitAmount: number;
  totalAmount: number;
  currency: string;
  checkoutType: "plan" | "bundle" | "payment";
};

/** Paiement réglé depuis le portefeuille : rien à finaliser côté provider, juste à confirmer. */
type WalletPaid = {
  status: "paid";
  walletId: string;
  reference: string;
  amount: number;
  currency: string;
  label: string;
  returnUrl?: string;
};

/** Solde insuffisant : aucun débit, on connaît le manque exact à recharger. */
type WalletInsufficient = {
  status: "insufficient";
  walletId: string;
  balance: number;
  total: number;
  shortfall: number;
  currency: string;
};

type WalletDecision = WalletPaid | WalletInsufficient;

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DirectPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="yypay:flex yypay:min-h-full yypay:items-center yypay:justify-center yypay:bg-background">
          <Loader2 className="yypay:h-8 yypay:w-8 yypay:animate-spin yypay:text-primary" />
        </div>
      }
    >
      <DirectPaymentContent />
    </Suspense>
  );
}

function DirectPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = useMemo(() => searchParams.toString(), [searchParams]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [recharging, setRecharging] = useState(false);
  const [context, setContext] = useState<DirectPaymentContextResponse | null>(
    null,
  );
  const [insufficient, setInsufficient] = useState<WalletInsufficient | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadContext() {
      if (!queryString) {
        setError("Paramètres de paiement manquants");
        setLoading(false);
        return;
      }

      try {
        const session = await bffFetch<{ organizationId?: string }>(
          "/api/session/context",
        ).catch(() => null);

        // Aucune session : la fenêtre exige une connexion (avec MFA) avant tout paiement.
        if (!session) {
          const returnTo = `/direct-payment?${queryString}`;
          router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }

        const data = await bffFetch<DirectPaymentContextResponse>(
          `/api/direct-payment/context?${queryString}`,
        );
        setContext(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Impossible de charger le paiement",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadContext();
  }, [queryString, router]);

  /** Paiement DEPUIS LE PORTEFEUILLE. Si le solde manque, on bascule sur l'étape de recharge. */
  async function handlePay() {
    if (!queryString) {
      return;
    }
    setPaying(true);
    setError(null);
    try {
      const decision = await bffFetch<WalletDecision>(
        `/api/direct-payment/wallet-pay?${queryString}`,
        { method: "POST" },
      );

      if (decision.status === "insufficient") {
        setInsufficient(decision);
        return;
      }

      // Réglé : on transmet le résultat à la page de statut (qui notifie la plateforme appelante).
      sessionStorage.setItem(
        DIRECT_WALLET_COMPLETION_STORAGE_KEY,
        JSON.stringify({
          success: true,
          walletId: decision.walletId,
          reference: decision.reference,
          amount: decision.amount,
          currency: decision.currency,
          label: decision.label,
          returnUrl: decision.returnUrl,
        }),
      );
      router.replace("/direct-payment/return?payment=success&flow=wallet");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec du paiement");
    } finally {
      setPaying(false);
    }
  }

  /** Recharge du différentiel manquant, via le provider ; retour ensuite sur cette même fenêtre. */
  async function handleRecharge() {
    if (!queryString) {
      return;
    }
    setRecharging(true);
    try {
      const result = await bffFetch<{ redirectUrl: string; amount: number }>(
        `/api/direct-payment/wallet-recharge?${queryString}`,
        { method: "POST" },
      );
      window.location.assign(result.redirectUrl);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Échec du lancement de la recharge",
      );
      setRecharging(false);
    }
  }

  const modeLabel =
    context?.mode === "of_org"
      ? "Achat d'un service de l'organisation"
      : "Achat pour l'organisation";

  return (
    <div className="yypay:flex yypay:min-h-full yypay:flex-col yypay:bg-background">
      <header className="yypay:border-b yypay:border-border yypay:bg-card yypay:px-4 yypay:py-4 sm:yypay:px-6">
        <div className="yypay:mx-auto yypay:flex yypay:max-w-lg yypay:items-center yypay:gap-3">
          <span className="yypay:flex yypay:h-10 yypay:w-10 yypay:items-center yypay:justify-center yypay:rounded-lg yypay:bg-primary yypay:text-primary-foreground">
            <CreditCard className="yypay:h-5 yypay:w-5" />
          </span>
          <div>
            <p className="yypay:text-sm yypay:font-medium yypay:text-muted-foreground">
              YowYob Payment
            </p>
            <h1 className="yypay:text-lg yypay:font-semibold yypay:text-foreground">
              Paiement direct
            </h1>
          </div>
        </div>
      </header>

      <main className="yypay:mx-auto yypay:w-full yypay:max-w-lg yypay:flex-1 yypay:px-4 yypay:py-8 sm:yypay:px-6">
        {loading && (
          <div className="yypay:space-y-4">
            <Skeleton className="yypay:h-8 yypay:w-2/3" />
            <Skeleton className="yypay:h-40 yypay:w-full" />
            <Skeleton className="yypay:h-12 yypay:w-full" />
          </div>
        )}

        {!loading && error && !context && (
          <Card>
            <CardHeader>
              <CardTitle>Paiement indisponible</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {!loading && context && (
          <Card className="yypay:shadow-card">
            <CardHeader className="yypay:space-y-3">
              <div className="yypay:flex yypay:items-start yypay:justify-between yypay:gap-3">
                <div className="yypay:flex yypay:items-center yypay:gap-2">
                  <ShoppingBag className="yypay:h-5 yypay:w-5 yypay:text-primary" />
                  <CardTitle className="yypay:text-xl">{context.label}</CardTitle>
                </div>
                <Badge variant="secondary">{modeLabel}</Badge>
              </div>
              {context.description && (
                <CardDescription>{context.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="yypay:space-y-6">
              <dl className="yypay:space-y-3 yypay:text-sm">
                <div className="yypay:flex yypay:justify-between yypay:gap-4">
                  <dt className="yypay:text-muted-foreground">Quantité</dt>
                  <dd className="yypay:font-medium">{context.quantity}</dd>
                </div>
                <div className="yypay:flex yypay:justify-between yypay:gap-4">
                  <dt className="yypay:text-muted-foreground">Prix unitaire</dt>
                  <dd className="yypay:font-medium">
                    {formatAmount(context.unitAmount, context.currency)}
                  </dd>
                </div>
                <div className="yypay:flex yypay:justify-between yypay:gap-4 yypay:border-t yypay:border-border yypay:pt-3">
                  <dt className="yypay:font-semibold">Total</dt>
                  <dd className="yypay:text-lg yypay:font-bold yypay:text-primary">
                    {formatAmount(context.totalAmount, context.currency)}
                  </dd>
                </div>
              </dl>

              {insufficient ? (
                <div className="yypay:space-y-4 yypay:rounded-lg yypay:border yypay:border-border yypay:bg-muted/40 yypay:p-4">
                  <div className="yypay:flex yypay:items-center yypay:gap-2 yypay:text-sm yypay:font-medium">
                    <Wallet className="yypay:h-4 yypay:w-4 yypay:text-primary" />
                    Solde de votre portefeuille insuffisant
                  </div>
                  <dl className="yypay:space-y-2 yypay:text-sm">
                    <div className="yypay:flex yypay:justify-between yypay:gap-4">
                      <dt className="yypay:text-muted-foreground">Solde actuel</dt>
                      <dd className="yypay:font-medium">
                        {formatAmount(insufficient.balance, insufficient.currency)}
                      </dd>
                    </div>
                    <div className="yypay:flex yypay:justify-between yypay:gap-4">
                      <dt className="yypay:text-muted-foreground">
                        Montant à recharger
                      </dt>
                      <dd className="yypay:font-semibold yypay:text-primary">
                        {formatAmount(
                          insufficient.shortfall,
                          insufficient.currency,
                        )}
                      </dd>
                    </div>
                  </dl>
                  <Button
                    className="yypay:w-full"
                    size="lg"
                    onClick={handleRecharge}
                    disabled={recharging}
                  >
                    {recharging && (
                      <Loader2 className="yypay:h-4 yypay:w-4 yypay:animate-spin" />
                    )}
                    Recharger{" "}
                    {formatAmount(insufficient.shortfall, insufficient.currency)}{" "}
                    et payer
                  </Button>
                  <p className="yypay:text-center yypay:text-xs yypay:text-muted-foreground">
                    Après la recharge, vous reviendrez ici pour régler l&apos;achat
                    depuis votre portefeuille.
                  </p>
                </div>
              ) : (
                <>
                  <Button
                    className="yypay:w-full"
                    size="lg"
                    onClick={handlePay}
                    disabled={paying}
                  >
                    {paying ? (
                      <Loader2 className="yypay:h-4 yypay:w-4 yypay:animate-spin" />
                    ) : (
                      <Wallet className="yypay:h-4 yypay:w-4" />
                    )}
                    Payer depuis mon portefeuille
                  </Button>
                  <p className="yypay:text-center yypay:text-xs yypay:text-muted-foreground">
                    Le paiement est prélevé sur le solde de votre portefeuille
                    YowYob. Le montant est recalculé côté serveur.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
