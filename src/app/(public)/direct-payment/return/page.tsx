"use client";

import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { bffFetch } from "@/lib/bff-client";
import {
    DIRECT_PAYMENT_SESSION_STORAGE_KEY,
    DIRECT_WALLET_COMPLETION_STORAGE_KEY,
} from "@/lib/bundle-constants";
import type { DirectPaymentSession } from "@/lib/direct-payment";
import { parsePaymentReturn } from "@/lib/payment-callback";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

type FinalizeResponse = {
  status: string;
  success: boolean;
  paymentOrderId?: string;
  orgWalletCredited?: boolean;
  orgWalletMessage?: string;
};

const CLOSE_DELAY_MS = 5000;

/**
 * Notifie la plateforme APPELANTE du résultat, via `postMessage` vers la fenêtre ouvrante.
 *
 * On restreint la cible à l'origine de `returnUrl` quand elle est connue : sans ça, le message
 * partirait vers `*` et n'importe quelle page pourrait le lire. C'est ce message qui permet à la
 * plateforme d'afficher ce qu'elle veut une fois la fenêtre fermée.
 */
function notifyOpener(payload: {
  success: boolean;
  orderId?: string;
  paymentOrderId?: string;
  reference?: string;
  paymentStatus?: string;
  returnUrl?: string;
}) {
  if (typeof window === "undefined" || !window.opener) {
    return;
  }
  let targetOrigin = "*";
  if (payload.returnUrl) {
    try {
      targetOrigin = new URL(payload.returnUrl).origin;
    } catch {
      targetOrigin = "*";
    }
  }
  window.opener.postMessage(
    {
      type: "yypay:payment:complete",
      status: payload.success ? "success" : "failure",
      orderId: payload.orderId,
      paymentOrderId: payload.paymentOrderId,
      reference: payload.reference,
      paymentStatus: payload.paymentStatus,
    },
    targetOrigin,
  );
}

export default function DirectPaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="yypay:flex yypay:min-h-full yypay:items-center yypay:justify-center">
          <Loader2 className="yypay:h-8 yypay:w-8 yypay:animate-spin yypay:text-primary" />
        </div>
      }
    >
      <DirectPaymentReturnContent />
    </Suspense>
  );
}

function DirectPaymentReturnContent() {
  const searchParams = useSearchParams();
  const paymentReturn = useMemo(
    () => parsePaymentReturn(searchParams.get("payment")),
    [searchParams],
  );
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<FinalizeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const closeTimerStarted = useRef(false);

  useEffect(() => {
    async function finalizePayment() {
      // Cas portefeuille : le paiement est DÉJÀ réglé (débit synchrone du wallet). Il n'y a rien à
      // finaliser côté provider — on confirme, on notifie la plateforme appelante, puis on ferme.
      const walletRaw = sessionStorage.getItem(
        DIRECT_WALLET_COMPLETION_STORAGE_KEY,
      );
      if (walletRaw) {
        try {
          const completion = JSON.parse(walletRaw) as {
            success: boolean;
            reference?: string;
            amount?: number;
            currency?: string;
            returnUrl?: string;
          };
          sessionStorage.removeItem(DIRECT_WALLET_COMPLETION_STORAGE_KEY);
          setResult({
            status: completion.success ? "PAID" : "FAILED",
            success: completion.success,
          });
          notifyOpener({
            success: completion.success,
            reference: completion.reference,
            paymentStatus: completion.success ? "PAID" : "FAILED",
            returnUrl: completion.returnUrl,
          });
        } catch {
          setError("Résultat de paiement illisible");
        } finally {
          setLoading(false);
        }
        return;
      }

      const raw = sessionStorage.getItem(DIRECT_PAYMENT_SESSION_STORAGE_KEY);
      if (!raw) {
        setError("Session de paiement introuvable");
        setLoading(false);
        return;
      }

      let session: DirectPaymentSession;
      try {
        session = JSON.parse(raw) as DirectPaymentSession;
      } catch {
        setError("Session de paiement invalide");
        setLoading(false);
        return;
      }

      try {
        const data = await bffFetch<FinalizeResponse>(
          "/api/direct-payment/finalize",
          {
            method: "POST",
            body: JSON.stringify({
              session,
              paymentReturn: paymentReturn ?? "failure",
            }),
          },
        );
        setResult(data);
        sessionStorage.removeItem(DIRECT_PAYMENT_SESSION_STORAGE_KEY);
        notifyOpener({
          success: data.success,
          orderId: session.orderId,
          paymentOrderId: data.paymentOrderId,
          reference: session.reference,
          paymentStatus: data.status,
          returnUrl: session.returnUrl,
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors de la finalisation du paiement",
        );
      } finally {
        setLoading(false);
      }
    }

    void finalizePayment();
  }, [paymentReturn]);

  useEffect(() => {
    if (loading || closeTimerStarted.current) {
      return;
    }
    closeTimerStarted.current = true;

    const closeAt = Date.now() + CLOSE_DELAY_MS;
    const countdown = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((closeAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    }, 250);

    const closeTimer = window.setTimeout(() => {
      window.clearInterval(countdown);
      window.close();
    }, CLOSE_DELAY_MS);

    return () => {
      window.clearInterval(countdown);
      window.clearTimeout(closeTimer);
    };
  }, [loading]);

  const isSuccess = result?.success;
  const title = loading
    ? "Finalisation du paiement"
    : isSuccess
      ? "Paiement réussi"
      : "Paiement non abouti";

  return (
    <div className="yypay:flex yypay:min-h-full yypay:items-center yypay:justify-center yypay:bg-background yypay:px-4 yypay:py-10">
      <Card className="yypay:w-full yypay:max-w-md yypay:shadow-card">
        <CardHeader className="yypay:items-center yypay:text-center">
          {loading ? (
            <Loader2 className="yypay:mb-2 yypay:h-10 yypay:w-10 yypay:animate-spin yypay:text-primary" />
          ) : isSuccess ? (
            <CheckCircle2 className="yypay:mb-2 yypay:h-10 yypay:w-10 yypay:text-success" />
          ) : (
            <XCircle className="yypay:mb-2 yypay:h-10 yypay:w-10 yypay:text-red-500" />
          )}
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {loading
              ? "Vérification du statut auprès du fournisseur de paiement..."
              : error ??
                (isSuccess
                  ? "Votre transaction a été confirmée."
                  : `Statut : ${result?.status ?? "échec"}`)}
          </CardDescription>
        </CardHeader>
        <CardContent className="yypay:space-y-4 yypay:text-center">
          {!loading && result?.orgWalletMessage && (
            <p className="yypay:text-sm yypay:text-muted-foreground">
              {result.orgWalletMessage}
            </p>
          )}
          {!loading && result?.orgWalletCredited && (
            <Badge variant="success">Wallet organisation crédité</Badge>
          )}
          {!loading && (
            <p className="yypay:text-sm yypay:text-muted-foreground">
              Cette fenêtre se fermera automatiquement dans{" "}
              <span className="yypay:font-semibold yypay:text-foreground">
                {secondsLeft}
              </span>{" "}
              seconde{secondsLeft > 1 ? "s" : ""}.
            </p>
          )}
          {!loading && (
            <p className="yypay:text-xs yypay:text-muted-foreground">
              Si la fenêtre ne se ferme pas, vous pouvez la fermer manuellement.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
