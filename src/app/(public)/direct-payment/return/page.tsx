"use client";

import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useLocale } from "@/i18n/locale-provider";
import { bffFetch } from "@/lib/bff-client";
import { DIRECT_PAYMENT_SESSION_STORAGE_KEY } from "@/lib/bundle-constants";
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
  const { t } = useLocale();
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
      const raw = sessionStorage.getItem(DIRECT_PAYMENT_SESSION_STORAGE_KEY);
      if (!raw) {
        setError(t.directPayment.return.sessionNotFound);
        setLoading(false);
        return;
      }

      let session: DirectPaymentSession;
      try {
        session = JSON.parse(raw) as DirectPaymentSession;
      } catch {
        setError(t.directPayment.return.sessionInvalid);
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

        if (window.opener) {
          const targetOrigin = (() => {
            if (!session.returnUrl) {
              return "*";
            }
            try {
              return new URL(session.returnUrl).origin;
            } catch {
              return "*";
            }
          })();

          window.opener.postMessage(
            {
              type: "yypay:payment:complete",
              status: data.success ? "success" : "failure",
              orderId: session.orderId,
              paymentOrderId: data.paymentOrderId,
              reference: session.reference,
              paymentStatus: data.status,
            },
            targetOrigin,
          );
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t.directPayment.return.finalizeError,
        );
      } finally {
        setLoading(false);
      }
    }

    void finalizePayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    ? t.directPayment.return.finalizing
    : isSuccess
      ? t.directPayment.return.success
      : t.directPayment.return.failed;

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
              ? t.directPayment.return.verifying
              : error ??
                (isSuccess
                  ? t.directPayment.return.confirmed
                  : `${t.directPayment.return.statusPrefix} ${result?.status ?? t.directPayment.return.unknownStatus}`)}
          </CardDescription>
        </CardHeader>
        <CardContent className="yypay:space-y-4 yypay:text-center">
          {!loading && result?.orgWalletMessage && (
            <p className="yypay:text-sm yypay:text-muted-foreground">
              {result.orgWalletMessage}
            </p>
          )}
          {!loading && result?.orgWalletCredited && (
            <Badge variant="success">{t.directPayment.return.orgWalletCredited}</Badge>
          )}
          {!loading && (
            <p className="yypay:text-sm yypay:text-muted-foreground">
              {t.directPayment.return.closingIn}{" "}
              <span className="yypay:font-semibold yypay:text-foreground">
                {secondsLeft}
              </span>{" "}
              {t.directPayment.return.secondsLabel(secondsLeft)}.
            </p>
          )}
          {!loading && (
            <p className="yypay:text-xs yypay:text-muted-foreground">
              {t.directPayment.return.manualCloseNote}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
