"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { toIntlTag } from "@/i18n/format";
import { useLocale } from "@/i18n/locale-provider";
import { BffError, bffGet, bffPost } from "@/lib/bff-client";
import {
    formatBillingPeriodLabel,
    getPlanLabel,
} from "@/lib/commercial-plan-display";
import {
    buildPendingPaymentMessage,
    canPurchasePlan,
    getPendingPlanCodes,
} from "@/lib/plan-subscription";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import type { components } from "@/types/schemas-payment";
import { Loader2, Trash2, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

type CommercialPlanQuoteResponse =
  components["schemas"]["CommercialPlanQuoteResponse"];
type CommercialPlanResponse = components["schemas"]["CommercialPlanResponse"];
type CommercialPlanOrderResponse =
  components["schemas"]["CommercialPlanOrderResponse"];
type SubscriptionResponse = components["schemas"]["SubscriptionResponse"];
type ServicePriceLine = components["schemas"]["ServicePriceResponse"];
type BillingPeriod = NonNullable<
  components["schemas"]["CommercialPlanCheckoutRequest"]["billingPeriod"]
>;

type AggregatedQuote = {
  billingPeriod: BillingPeriod;
  lines: ServicePriceLine[];
  total: number;
  currency: string;
};

type SessionContext = {
  organizationId: string | null;
  actorId: string | null;
  walletId: string | null;
};

/** Réponse du noyau à la demande de code (achat par le portefeuille, étape 1). */
type WalletCheckoutChallenge = {
  checkoutId: string;
  amount: number;
  currency: string;
  challengeToken: string;
  expiresInSeconds: number;
  codePreview?: string | null;
};

/** Achat en attente de son code : le plan et ses options sont figés jusqu'à la confirmation. */
type PendingWalletCheckout = WalletCheckoutChallenge & {
  planCode: string;
  addOnCodes: string[];
  billingPeriod: BillingPeriod;
};

type CartSheetProps = {
  trigger: ReactNode;
  walletName?: string | null;
  onCheckoutComplete?: () => void;
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return isMobile;
}

export function CartSheet({ trigger, onCheckoutComplete }: CartSheetProps) {
  const { t, locale } = useLocale();
  const intlTag = toIntlTag(locale);
  const [open, setOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("MONTHLY");
  const [quote, setQuote] = useState<AggregatedQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState<"challenge" | "confirm" | null>(
    null,
  );
  const [pending, setPending] = useState<PendingWalletCheckout | null>(null);
  const [code, setCode] = useState("");
  const [purchaseBlockMessage, setPurchaseBlockMessage] = useState<string | null>(
    null,
  );
  const [guardLoading, setGuardLoading] = useState(false);
  const isMobile = useIsMobile();
  const items = useCartStore((state) => state.items);
  const removePlan = useCartStore((state) => state.removePlan);
  const togglePlanAddOn = useCartStore((state) => state.togglePlanAddOn);
  const clearCart = useCartStore((state) => state.clearCart);

  const quoteSignature = useMemo(
    () =>
      items
        .map(
          (item) =>
            `${item.plan.code ?? ""}:${item.addOnCodes.slice().sort().join(",")}`,
        )
        .join("|"),
    [items],
  );

  const quoteTotal = quote?.total ?? 0;
  const quoteCurrency = quote?.currency ?? "XAF";

  useEffect(() => {
    if (!open || items.length === 0) {
      return;
    }

    let cancelled = false;
    const timer = globalThis.setTimeout(() => {
      setQuoteLoading(true);
      void Promise.all(
        items.map((item) => {
          const planCode = item.plan.code;
          if (!planCode) {
            return Promise.resolve(null);
          }
          return bffPost<CommercialPlanQuoteResponse>(
            `/api/plans/${planCode}/quote`,
            {
              billingPeriod,
              addOnCodes: item.addOnCodes,
            },
          );
        }),
      )
        .then((quotes) => {
          if (cancelled) return;

          const validQuotes = quotes.filter(
            (planQuote): planQuote is CommercialPlanQuoteResponse =>
              planQuote != null,
          );

          const lines = validQuotes.flatMap((planQuote) =>
            (planQuote.lines ?? []).map((line) => ({
              ...line,
              serviceCode: planQuote.plan?.code
                ? `${planQuote.plan.code}:${line.serviceCode ?? ""}`
                : line.serviceCode,
            })),
          );
          const total = validQuotes.reduce(
            (sum, planQuote) => sum + (planQuote.total ?? 0),
            0,
          );
          const currency =
            validQuotes.find((planQuote) => planQuote.currency)?.currency ??
            "XAF";

          setQuote({ billingPeriod, lines, total, currency });
        })
        .catch((error) => {
          if (!cancelled) {
            setQuote(null);
            toast.error(error instanceof Error ? error.message : t.cart.quoteError);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setQuoteLoading(false);
          }
        });
    }, 0);

    return () => {
      cancelled = true;
      globalThis.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items, quoteSignature, billingPeriod]);

  useEffect(() => {
    if (!open || items.length === 0) {
      const timer = globalThis.setTimeout(() => {
        setPurchaseBlockMessage(null);
      }, 0);
      return () => globalThis.clearTimeout(timer);
    }

    let cancelled = false;
    const timer = globalThis.setTimeout(() => {
      setGuardLoading(true);
      void Promise.all([
        bffGet<SubscriptionResponse[]>("/api/plans/subscriptions"),
        bffGet<CommercialPlanResponse[]>("/api/plans"),
        bffGet<CommercialPlanOrderResponse[]>("/api/commercial-plans/orders"),
        bffGet<SessionContext>("/api/session/context"),
      ])
        .then(([subscriptions, plans, orders, session]) => {
          if (cancelled) return;

          const purchaseGuard = canPurchasePlan(
            Array.isArray(subscriptions) ? subscriptions : [],
            Array.isArray(plans) ? plans : [],
            t,
            intlTag,
          );
          if (!purchaseGuard.allowed) {
            setPurchaseBlockMessage(purchaseGuard.reason ?? null);
            return;
          }

          const pendingPlanCodes = getPendingPlanCodes(
            Array.isArray(orders) ? orders : [],
            session.organizationId,
          );
          const blockedItem = items.find(
            (item) => item.plan.code && pendingPlanCodes.has(item.plan.code),
          );
          if (blockedItem?.plan.code) {
            setPurchaseBlockMessage(
              buildPendingPaymentMessage(blockedItem.plan.code, t),
            );
            return;
          }

          setPurchaseBlockMessage(null);
        })
        .catch(() => {
          if (!cancelled) {
            setPurchaseBlockMessage(null);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setGuardLoading(false);
          }
        });
    }, 0);

    return () => {
      cancelled = true;
      globalThis.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items, quoteSignature]);

  useEffect(() => {
    if (!open || items.length === 0) {
      const timer = globalThis.setTimeout(() => setQuote(null), 0);
      return () => globalThis.clearTimeout(timer);
    }
  }, [open, items.length]);

  function assertCheckoutAllowed(): boolean {
    if (purchaseBlockMessage) {
      toast.error(purchaseBlockMessage);
      return false;
    }
    return true;
  }

  async function getSessionContext(): Promise<SessionContext> {
    return bffGet<SessionContext>("/api/session/context");
  }

  /** Message lisible pour les refus attendus du noyau (solde, portefeuille, code). */
  function checkoutErrorMessage(error: unknown): string {
    if (error instanceof BffError) {
      switch (error.errorCode) {
        case "PAYMENT_INSUFFICIENT_BALANCE":
          return t.cart.insufficientBalance;
        case "PAYMENT_WALLET_NOT_FOUND":
          return t.cart.noWallet;
        case "PAYMENT_MFA_REQUIRED":
          return t.cart.invalidCode;
      }
    }
    return error instanceof Error ? error.message : t.cart.walletPaymentError;
  }

  // Tout achat Yowyob se paie par débit du portefeuille de l'organisation : le noyau vérifie le
  // solde et envoie un code, puis débite et active le plan d'un seul tenant à la confirmation.
  async function handleRequestCode() {
    if (items.length !== 1) return;
    if (!assertCheckoutAllowed()) return;
    const item = items[0];
    const planCode = item?.plan.code;
    if (!planCode) {
      toast.error(t.cart.invalidPlanInCart);
      return;
    }

    setCheckingOut("challenge");
    try {
      const context = await getSessionContext();
      if (!context.organizationId) {
        throw new Error(t.cart.orgNotSelected);
      }
      const challenge = await bffPost<WalletCheckoutChallenge>(
        `/api/commercial-plans/${encodeURIComponent(planCode)}/wallet-checkout/challenge`,
        { addOnCodes: item.addOnCodes, billingPeriod },
      );
      setPending({ ...challenge, planCode, addOnCodes: item.addOnCodes, billingPeriod });
      setCode("");
      toast.success(t.cart.codeSent);
    } catch (error) {
      toast.error(checkoutErrorMessage(error));
    } finally {
      setCheckingOut(null);
    }
  }

  async function handleConfirm(event: React.FormEvent) {
    event.preventDefault();
    if (!pending || !code.trim()) return;
    setCheckingOut("confirm");
    try {
      await bffPost(
        `/api/commercial-plans/${encodeURIComponent(pending.planCode)}/wallet-checkout`,
        {
          checkoutId: pending.checkoutId,
          addOnCodes: pending.addOnCodes,
          billingPeriod: pending.billingPeriod,
          challengeToken: pending.challengeToken,
          code: code.trim(),
        },
      );
      toast.success(t.cart.walletPaymentSuccess);
      setPending(null);
      setCode("");
      clearCart();
      setOpen(false);
      onCheckoutComplete?.();
    } catch (error) {
      toast.error(checkoutErrorMessage(error));
    } finally {
      setCheckingOut(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side={isMobile ? "bottom" : "right"}>
        <SheetHeader>
          <SheetTitle>{t.cart.title}</SheetTitle>
          <SheetDescription>
            {t.cart.itemCount(items.length)}
            {quoteLoading
              ? t.cart.calculatingQuote
              : quote
                ? t.cart.totalSuffix(quoteTotal.toLocaleString(intlTag), quoteCurrency)
                : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="yypay:flex-1 yypay:overflow-y-auto yypay:px-6 yypay:py-4">
          {items.length === 0 ? (
            <p className="yypay:text-sm yypay:text-secondary">
              {t.cart.empty}
            </p>
          ) : (
            <>
              {purchaseBlockMessage && (
                <div className="yypay:mb-4 yypay:rounded-lg yypay:border yypay:border-border yypay:bg-muted/40 yypay:p-3 yypay:text-sm yypay:text-muted-foreground">
                  {purchaseBlockMessage}
                </div>
              )}
              <div className="yypay:mb-4 yypay:flex yypay:gap-2">
                {(["MONTHLY", "YEARLY"] as const).map((period) => (
                  <Button
                    key={period}
                    type="button"
                    size="sm"
                    variant={billingPeriod === period ? "default" : "outline"}
                    className="yypay:flex-1"
                    onClick={() => setBillingPeriod(period)}
                  >
                    {formatBillingPeriodLabel(period, t)}
                  </Button>
                ))}
              </div>
              <ul className="yypay:space-y-4">
                {items.map((item) => {
                  const planCode = item.plan.code ?? "";
                  const compatibleAddOns = item.plan.compatibleAddOnCodes ?? [];

                  return (
                    <li
                      key={planCode || getPlanLabel(item.plan, t)}
                      className="yypay:rounded-lg yypay:border yypay:border-border yypay:p-4"
                    >
                      <div className="yypay:flex yypay:items-start yypay:justify-between yypay:gap-3">
                        <div className="yypay:min-w-0">
                          <p className="yypay:font-medium yypay:text-foreground">
                            {getPlanLabel(item.plan, t)}
                          </p>
                          <p className="yypay:text-sm yypay:text-secondary">
                            {planCode}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => planCode && removePlan(planCode)}
                          aria-label={t.cart.removeFromCart}
                        >
                          <Trash2 className="yypay:h-4 yypay:w-4" />
                        </Button>
                      </div>

                      {compatibleAddOns.length > 0 && (
                        <div className="yypay:mt-4 yypay:space-y-2">
                          <p className="yypay:text-xs yypay:font-medium yypay:uppercase yypay:tracking-wide yypay:text-secondary">
                            {t.cart.addOns}
                          </p>
                          <div className="yypay:flex yypay:flex-wrap yypay:gap-2">
                            {compatibleAddOns.map((addOnCode) => {
                              const selected = item.addOnCodes.includes(addOnCode);
                              return (
                                <Button
                                  key={addOnCode}
                                  type="button"
                                  size="sm"
                                  variant={selected ? "default" : "outline"}
                                  onClick={() =>
                                    planCode && togglePlanAddOn(planCode, addOnCode)
                                  }
                                >
                                  {addOnCode}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {quote?.lines && quote.lines.length > 0 && (
                <div
                  className={cn(
                    "yypay:mt-4 yypay:rounded-lg yypay:border yypay:border-border yypay:p-3",
                    "yypay:text-sm yypay:text-secondary",
                  )}
                >
                  <p className="yypay:mb-2 yypay:font-medium yypay:text-foreground">
                    {t.cart.quoteDetails}
                  </p>
                  <ul className="yypay:space-y-1">
                    {quote.lines.map((line, index) => (
                      <li
                        key={`${line.serviceCode}-${index}`}
                        className="yypay:flex yypay:justify-between yypay:gap-2"
                      >
                        <span>{line.serviceCode}</span>
                        <span>
                          {line.amount?.toLocaleString(intlTag)} {line.currency}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {items.length > 0 && (
          <>
            <Separator />
            <SheetFooter>
              <div className="yypay:flex yypay:w-full yypay:flex-col yypay:gap-4">
                {pending ? (
                  <form onSubmit={handleConfirm} className="yypay:space-y-3">
                    <p className="yypay:text-sm yypay:text-secondary">
                      {t.cart.codeHint(
                        pending.amount.toLocaleString(intlTag),
                        pending.currency,
                      )}
                    </p>
                    <div className="yypay:space-y-2">
                      <Label htmlFor="cart-wallet-code">{t.cart.codeLabel}</Label>
                      <Input
                        id="cart-wallet-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        placeholder={pending.codePreview ?? undefined}
                        autoFocus
                      />
                    </div>
                    <Button
                      type="submit"
                      className="yypay:w-full"
                      disabled={checkingOut !== null || !code.trim()}
                    >
                      {checkingOut === "confirm" && (
                        <Loader2 className="yypay:h-4 yypay:w-4 yypay:animate-spin" />
                      )}
                      {t.cart.confirmPayment}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="yypay:w-full"
                      disabled={checkingOut !== null}
                      onClick={() => {
                        setPending(null);
                        setCode("");
                      }}
                    >
                      {t.cart.cancel}
                    </Button>
                  </form>
                ) : (
                  <>
                    <Button
                      onClick={handleRequestCode}
                      disabled={
                        checkingOut !== null ||
                        quoteLoading ||
                        guardLoading ||
                        !quote ||
                        items.length !== 1 ||
                        Boolean(purchaseBlockMessage)
                      }
                      className="yypay:w-full"
                    >
                      {checkingOut === "challenge" ? (
                        <Loader2 className="yypay:h-4 yypay:w-4 yypay:animate-spin" />
                      ) : (
                        <Wallet className="yypay:h-4 yypay:w-4" />
                      )}
                      {t.cart.payViaWallet}
                    </Button>
                    <p className="yypay:text-center yypay:text-xs yypay:text-secondary">
                      {items.length > 1 ? t.cart.onePlanAtATime : t.cart.walletOnlyNote}{" "}
                      <Link
                        href="/console/wallet"
                        className="yypay:font-medium yypay:text-primary yypay:underline-offset-4 yypay:hover:underline"
                        onClick={() => setOpen(false)}
                      >
                        {t.cart.rechargeWallet}
                      </Link>
                    </p>
                  </>
                )}
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
