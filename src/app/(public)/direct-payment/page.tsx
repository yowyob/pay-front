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
import { toIntlTag } from "@/i18n/format";
import { useLocale } from "@/i18n/locale-provider";
import { bffFetch } from "@/lib/bff-client";
import { DIRECT_PAYMENT_SESSION_STORAGE_KEY } from "@/lib/bundle-constants";
import type { DirectPaymentSession } from "@/lib/direct-payment";
import { CreditCard, Loader2, ShoppingBag } from "lucide-react";
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

type CheckoutResponse = {
  orderId: string;
  orderType: "plan" | "bundle" | "payment";
  paymentOrderId?: string;
  redirectUrl?: string;
  session: DirectPaymentSession;
};

function formatAmount(amount: number, currency: string, intlTag: string) {
  return new Intl.NumberFormat(intlTag, {
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
  const { t, locale } = useLocale();
  const intlTag = toIntlTag(locale);
  const searchParams = useSearchParams();
  const queryString = useMemo(() => searchParams.toString(), [searchParams]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [context, setContext] = useState<DirectPaymentContextResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadContext() {
      if (!queryString) {
        setError(t.directPayment.missingParams);
        setLoading(false);
        return;
      }

      try {
        const session = await bffFetch<{ organizationId?: string }>(
          "/api/session/context",
        ).catch(() => null);

        if (!session) {
          const returnTo = `/direct-payment?${queryString}`;
          router.replace(
            `/login?returnTo=${encodeURIComponent(returnTo)}`,
          );
          return;
        }

        const data = await bffFetch<DirectPaymentContextResponse>(
          `/api/direct-payment/context?${queryString}`,
        );
        setContext(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.directPayment.loadError);
      } finally {
        setLoading(false);
      }
    }

    void loadContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString, router]);

  async function handlePay() {
    if (!queryString) {
      return;
    }
    setPaying(true);
    try {
      const result = await bffFetch<CheckoutResponse>(
        `/api/direct-payment/checkout?${queryString}`,
        { method: "POST" },
      );
      sessionStorage.setItem(
        DIRECT_PAYMENT_SESSION_STORAGE_KEY,
        JSON.stringify(result.session),
      );
      if (!result.redirectUrl) {
        throw new Error(t.directPayment.redirectUrlMissing);
      }
      window.location.assign(result.redirectUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.directPayment.launchError);
      setPaying(false);
    }
  }

  const modeLabel =
    context?.mode === "of_org"
      ? t.directPayment.modeOfOrg
      : t.directPayment.modeForOrg;

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
              {t.directPayment.brandTitle}
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

        {!loading && error && (
          <Card>
            <CardHeader>
              <CardTitle>{t.directPayment.unavailableTitle}</CardTitle>
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
                  <dt className="yypay:text-muted-foreground">{t.directPayment.quantityLabel}</dt>
                  <dd className="yypay:font-medium">{context.quantity}</dd>
                </div>
                <div className="yypay:flex yypay:justify-between yypay:gap-4">
                  <dt className="yypay:text-muted-foreground">{t.directPayment.unitPriceLabel}</dt>
                  <dd className="yypay:font-medium">
                    {formatAmount(context.unitAmount, context.currency, intlTag)}
                  </dd>
                </div>
                <div className="yypay:flex yypay:justify-between yypay:gap-4 yypay:border-t yypay:border-border yypay:pt-3">
                  <dt className="yypay:font-semibold">{t.directPayment.totalLabel}</dt>
                  <dd className="yypay:text-lg yypay:font-bold yypay:text-primary">
                    {formatAmount(context.totalAmount, context.currency, intlTag)}
                  </dd>
                </div>
              </dl>

              <Button
                className="yypay:w-full"
                size="lg"
                onClick={handlePay}
                disabled={paying}
              >
                {paying && (
                  <Loader2 className="yypay:h-4 yypay:w-4 yypay:animate-spin" />
                )}
                {t.directPayment.payWithMycoolpay}
              </Button>

              <p className="yypay:text-center yypay:text-xs yypay:text-muted-foreground">
                {t.directPayment.serverRecalcNote}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
