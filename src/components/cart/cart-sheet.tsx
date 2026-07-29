"use client";

import { Button } from "@/components/ui/button";
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
import { bffGet, bffPost } from "@/lib/bff-client";
import { COMMERCIAL_PLAN_ORDER_STORAGE_KEY } from "@/lib/bundle-constants";
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
import { formatMycoolpayLabel } from "@/lib/wallet-labels";
import { useCartStore } from "@/stores/cart-store";
import type { components } from "@/types/schemas-payment";
import { CreditCard, Loader2, Trash2, Wallet } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

type CommercialPlanCheckoutResponse =
  components["schemas"]["CommercialPlanCheckoutResponse"];
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

function createCartIdempotencyKey(planCode: string) {
  return `cart-${planCode}-${crypto.randomUUID()}`;
}

function redirectToPayment(url: string) {
  globalThis.location.assign(url);
}

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

export function CartSheet({ trigger, walletName, onCheckoutComplete }: CartSheetProps) {
  const { t, locale } = useLocale();
  const intlTag = toIntlTag(locale);
  const [open, setOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("MONTHLY");
  const [quote, setQuote] = useState<AggregatedQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState<"wallet" | "mycoolpay" | null>(
    null,
  );
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
  const mycoolpayLabel = formatMycoolpayLabel(walletName);

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

  async function handleWalletCheckout() {
    if (items.length === 0) return;
    if (!assertCheckoutAllowed()) return;
    setCheckingOut("wallet");
    try {
      const context = await getSessionContext();
      if (!context.organizationId) {
        throw new Error(t.cart.orgNotSelected);
      }
      if (!context.walletId) {
        throw new Error(t.cart.noWallet);
      }
      if (!quoteTotal) {
        throw new Error(t.cart.quoteUnavailable);
      }

      const canOperate = await bffGet<boolean>(
        `/api/payments/wallets/${context.walletId}/can-operate?amount=${quoteTotal}`,
      );
      if (!canOperate) {
        toast.error(t.cart.insufficientBalance);
        return;
      }

      const failures: string[] = [];
      for (const item of items) {
        if (!item.plan.code) continue;
        try {
          await bffPost(`/api/plans/${item.plan.code}/purchase`, {
            organizationId: context.organizationId,
          });
        } catch (error) {
          failures.push(
            getPlanLabel(item.plan, t) ??
              (error instanceof Error ? error.message : t.cart.unknownError),
          );
        }
      }

      if (failures.length > 0) {
        toast.error(t.cart.partialFailure(failures.join(", ")));
      } else {
        toast.success(t.cart.walletPaymentSuccess);
      }

      clearCart();
      setOpen(false);
      onCheckoutComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.cart.walletPaymentError);
    } finally {
      setCheckingOut(null);
    }
  }

  async function handleMycoolpayCheckout() {
    if (items.length === 0) return;
    if (!assertCheckoutAllowed()) return;
    if (items.length > 1) {
      toast.error(t.cart.mycoolpaySingleLimit);
      return;
    }

    const cartItem = items[0];
    const planCode = cartItem?.plan.code;
    if (!planCode) {
      toast.error(t.cart.invalidPlanInCart);
      return;
    }

    setCheckingOut("mycoolpay");
    try {
      const context = await getSessionContext();
      if (!context.organizationId) {
        throw new Error(t.cart.orgNotSelected);
      }

      const checkout = await bffPost<CommercialPlanCheckoutResponse>(
        `/api/plans/${planCode}/checkout`,
        {
          organizationId: context.organizationId,
          addOnCodes: cartItem.addOnCodes,
          billingPeriod,
          provider: "MYCOOLPAY",
          method: "MOBILE_MONEY",
          idempotencyKey: createCartIdempotencyKey(planCode),
        },
      );

      if (checkout.orderId) {
        sessionStorage.setItem(
          COMMERCIAL_PLAN_ORDER_STORAGE_KEY,
          checkout.orderId,
        );
      }

      if (checkout.redirectUrl) {
        clearCart();
        redirectToPayment(checkout.redirectUrl);
        return;
      }

      toast.error(t.cart.mycoolpayRedirectMissing);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t.cart.mycoolpayPaymentError,
      );
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
                <Button
                  onClick={handleWalletCheckout}
                  disabled={
                    checkingOut !== null ||
                    quoteLoading ||
                    guardLoading ||
                    !quote ||
                    Boolean(purchaseBlockMessage)
                  }
                  className="yypay:w-full"
                >
                  {checkingOut === "wallet" ? (
                    <Loader2 className="yypay:h-4 yypay:w-4 yypay:animate-spin" />
                  ) : (
                    <Wallet className="yypay:h-4 yypay:w-4" />
                  )}
                  {t.cart.payViaWallet}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleMycoolpayCheckout}
                  disabled={
                    checkingOut !== null ||
                    quoteLoading ||
                    guardLoading ||
                    !quote ||
                    items.length > 1 ||
                    Boolean(purchaseBlockMessage)
                  }
                  className="yypay:w-full"
                >
                  {checkingOut === "mycoolpay" ? (
                    <Loader2 className="yypay:h-4 yypay:w-4 yypay:animate-spin" />
                  ) : (
                    <CreditCard className="yypay:h-4 yypay:w-4" />
                  )}
                  {t.cart.payVia(mycoolpayLabel)}
                </Button>
                {items.length > 1 && (
                  <p className="yypay:pt-1 yypay:text-center yypay:text-xs yypay:text-secondary">
                    {t.cart.mycoolpaySingleWarning}
                  </p>
                )}
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
