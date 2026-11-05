"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toIntlTag } from "@/i18n/format";
import { useLocale } from "@/i18n/locale-provider";
import { BffError, bffGet, bffPost } from "@/lib/bff-client";
import { withBasePath } from "@/lib/base-path";
import { CheckCircle2, Clock, Loader2, ShieldCheck, Wallet, XCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type CheckoutStatus = "OPEN" | "PAID" | "CANCELLED" | "EXPIRED";

type CheckoutView = {
  id: string;
  status: CheckoutStatus;
  merchantName: string;
  merchantAgencyName?: string | null;
  items: { label: string; description?: string | null; quantity: number; unitAmount: number }[];
  amount: number;
  currency: string;
  reference?: string | null;
  returnUrl?: string | null;
  expiresAt: string;
};

type WalletOption = { id: string; label: string; balance: number; kind: "personal" | "org" };

type SessionContext = { organizationId: string | null };

type Challenge = { challengeToken: string; codePreview?: string | null };

const RETURN_DELAY_SECONDS = 5;

/** Origine de l'adresse de retour : seule destinataire autorisée du message à la plateforme. */
function returnOrigin(returnUrl?: string | null): string | null {
  if (!returnUrl) return null;
  try {
    return new URL(returnUrl).origin;
  } catch {
    return null;
  }
}

/**
 * Caisse commune des plateformes Yowyob. La plateforme a créé l'achat côté serveur (prix compris) ;
 * l'acheteur, connecté en SSO, le règle par son portefeuille ou l'annule. La plateforme est ensuite
 * prévenue : message à la fenêtre qui a ouvert la caisse, ou retour sur son adresse.
 */
export default function CheckoutPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { t, locale } = useLocale();
  const intlTag = toIntlTag(locale);
  const [view, setView] = useState<CheckoutView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [walletId, setWalletId] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(RETURN_DELAY_SECONDS);

  const formatAmount = (value: number, currency: string) =>
    `${Number(value).toLocaleString(intlTag)} ${currency}`;

  const loadView = useCallback(async () => {
    try {
      setView(await bffGet<CheckoutView>(`/api/checkout/${encodeURIComponent(sessionId)}`));
    } catch (error) {
      if (error instanceof BffError && (error.status === 404 || error.status === 403)) {
        setNotFound(true);
      } else {
        toast.error(error instanceof Error ? error.message : t.checkout.error);
      }
    }
  }, [sessionId, t]);

  const loadWallets = useCallback(async () => {
    const options: WalletOption[] = [];
    // Deux essais : juste après la connexion, le premier appel échouait parfois, et seul le
    // portefeuille de l'organisation — peut-être le vendeur lui-même — restait proposé.
    for (let attempt = 0; attempt < 2 && options.length === 0; attempt += 1) {
      try {
        const mine = await bffGet<{ id?: string; balance?: number }>("/api/payments/wallets/mine");
        if (mine?.id) {
          options.push({ id: mine.id, label: t.checkout.personalWallet, balance: Number(mine.balance ?? 0), kind: "personal" });
        }
      } catch {
        // Pas encore de portefeuille personnel, ou appel en échec : un second essai.
      }
    }
    const personalWalletId = options[0]?.id;
    try {
      const context = await bffGet<SessionContext>("/api/session/context");
      if (context.organizationId) {
        const org = await bffGet<{ id?: string; balance?: number }>(
          `/api/payments/wallets/owner/${context.organizationId}`,
        );
        if (org?.id && !options.some((option) => option.id === org.id)) {
          options.push({ id: org.id, label: t.checkout.organizationWallet, balance: Number(org.balance ?? 0), kind: "org" });
        }
      }
    } catch {
      // Pas de portefeuille d'organisation, ou pas administrateur : seul le portefeuille personnel paie.
    }
    setWallets(options);
    // Présélection du seul portefeuille personnel : celui de l'organisation se choisit à la main.
    setWalletId((current) => current || personalWalletId || "");
  }, [t]);

  // Différé hors du rendu de l'effet (règle react-hooks/set-state-in-effect), comme ailleurs dans l'app.
  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      void loadView();
      void loadWallets();
    }, 0);
    return () => globalThis.clearTimeout(timer);
  }, [loadView, loadWallets]);

  const closed = view && view.status !== "OPEN";

  // Fin de parcours : la plateforme est prévenue, puis l'acheteur y revient au bout de 5 s.
  useEffect(() => {
    if (!view || view.status === "OPEN") return;
    const origin = returnOrigin(view.returnUrl);
    const message = { type: "yowyob-checkout", sessionId: view.id, status: view.status, reference: view.reference };
    if (window.opener && origin) {
      window.opener.postMessage(message, origin);
    }
    const timer = globalThis.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => globalThis.clearInterval(timer);
  }, [view]);

  const goBack = useCallback(() => {
    if (!view) return;
    if (window.opener) {
      window.close();
      return;
    }
    if (view.returnUrl) {
      const url = new URL(view.returnUrl);
      url.searchParams.set("checkout", view.id);
      url.searchParams.set("status", view.status);
      window.location.assign(url.toString());
      return;
    }
    window.location.assign(withBasePath("/console/transactions"));
  }, [view]);

  useEffect(() => {
    if (closed && countdown === 0) goBack();
  }, [closed, countdown, goBack]);

  function explain(error: unknown) {
    if (error instanceof BffError) {
      if (error.errorCode === "PAYMENT_MFA_REQUIRED") return t.checkout.invalidCode;
      if (error.errorCode === "PAYMENT_INSUFFICIENT_BALANCE") return t.checkout.insufficient;
    }
    return error instanceof Error ? error.message : t.checkout.error;
  }

  async function handleBuy() {
    setBusy(true);
    try {
      const result = await bffPost<Challenge>(`/api/checkout/${encodeURIComponent(sessionId)}/challenge`, {
        walletId: walletId || undefined,
      });
      setChallenge(result);
      setCode("");
      toast.success(t.checkout.codeSent);
    } catch (error) {
      toast.error(explain(error));
      if (error instanceof BffError && error.errorCode === "CHECKOUT_CLOSED") void loadView();
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm(event: React.FormEvent) {
    event.preventDefault();
    if (!challenge || !code.trim()) return;
    setBusy(true);
    try {
      await bffPost(`/api/checkout/${encodeURIComponent(sessionId)}/confirm`, {
        walletId: walletId || undefined,
        challengeToken: challenge.challengeToken,
        code: code.trim(),
      });
      setChallenge(null);
      await loadView();
    } catch (error) {
      toast.error(explain(error));
      if (error instanceof BffError && error.errorCode === "CHECKOUT_CLOSED") void loadView();
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    setBusy(true);
    try {
      await bffPost(`/api/checkout/${encodeURIComponent(sessionId)}/cancel`);
      await loadView();
    } catch (error) {
      toast.error(explain(error));
    } finally {
      setBusy(false);
    }
  }

  const selected = wallets.find((wallet) => wallet.id === walletId);
  const insufficient = Boolean(view && selected && selected.balance < view.amount);

  return (
    <main
      id="contenu"
      tabIndex={-1}
      className="yypay:mx-auto yypay:flex yypay:min-h-screen yypay:w-full yypay:max-w-lg yypay:flex-col yypay:justify-center yypay:bg-background yypay:px-4 yypay:py-8 yypay:focus:outline-none"
    >
      {notFound ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.checkout.title}</CardTitle>
            <CardDescription>{t.checkout.notFound}</CardDescription>
          </CardHeader>
        </Card>
      ) : !view ? (
        <div className="yypay:space-y-3" aria-busy="true" aria-label={t.checkout.loading}>
          <Skeleton className="yypay:h-10 yypay:w-2/3" />
          <Skeleton className="yypay:h-48 yypay:w-full" />
        </div>
      ) : closed ? (
        <Card>
          <CardHeader className="yypay:items-center yypay:text-center">
            {view.status === "PAID" ? (
              <CheckCircle2 className="yypay:h-12 yypay:w-12 yypay:text-emerald-600" aria-hidden="true" />
            ) : view.status === "CANCELLED" ? (
              <XCircle className="yypay:h-12 yypay:w-12 yypay:text-muted-foreground" aria-hidden="true" />
            ) : (
              <Clock className="yypay:h-12 yypay:w-12 yypay:text-muted-foreground" aria-hidden="true" />
            )}
            <CardTitle role="status">
              {view.status === "PAID"
                ? t.checkout.paidTitle
                : view.status === "CANCELLED"
                  ? t.checkout.cancelledTitle
                  : t.checkout.expiredTitle}
            </CardTitle>
            <CardDescription>
              {view.status === "PAID"
                ? t.checkout.paidBody
                : view.status === "CANCELLED"
                  ? t.checkout.cancelledBody
                  : t.checkout.expiredBody}
            </CardDescription>
          </CardHeader>
          <CardContent className="yypay:space-y-3 yypay:text-center">
            <p className="yypay:text-sm yypay:text-muted-foreground" aria-live="polite">
              {t.checkout.returning(countdown)}
            </p>
            <Button onClick={goBack}>{t.checkout.returnNow}</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="yypay:text-xl">{t.checkout.title}</CardTitle>
            <CardDescription>
              {t.checkout.seller} :{" "}
              <span className="yypay:font-medium yypay:text-foreground">
                {view.merchantName}
                {view.merchantAgencyName ? ` — ${view.merchantAgencyName}` : ""}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="yypay:space-y-5">
            <section aria-label={t.checkout.items} className="yypay:space-y-2">
              <ul className="yypay:divide-y yypay:divide-border yypay:rounded-lg yypay:border yypay:border-border">
                {view.items.map((item, index) => (
                  <li key={`${item.label}-${index}`} className="yypay:flex yypay:items-start yypay:justify-between yypay:gap-3 yypay:p-3">
                    <div className="yypay:min-w-0">
                      <p className="yypay:font-medium yypay:text-foreground">
                        {item.label}{" "}
                        <span className="yypay:text-sm yypay:font-normal yypay:text-muted-foreground">
                          {t.checkout.quantity(item.quantity)}
                        </span>
                      </p>
                      {item.description ? (
                        <p className="yypay:text-sm yypay:text-muted-foreground">{item.description}</p>
                      ) : null}
                    </div>
                    <span className="yypay:shrink-0 yypay:text-sm yypay:tabular-nums yypay:text-foreground">
                      {formatAmount(item.unitAmount * item.quantity, view.currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="yypay:flex yypay:items-baseline yypay:justify-between yypay:px-1">
                <span className="yypay:font-medium yypay:text-foreground">{t.checkout.total}</span>
                <span className="yypay:text-2xl yypay:font-bold yypay:tabular-nums yypay:text-foreground">
                  {formatAmount(view.amount, view.currency)}
                </span>
              </div>
              <p className="yypay:px-1 yypay:text-xs yypay:text-muted-foreground">
                {view.reference ? `${t.checkout.reference(view.reference)} · ` : ""}
                {t.checkout.expiresAt(new Date(view.expiresAt).toLocaleTimeString(intlTag, { hour: "2-digit", minute: "2-digit" }))}
              </p>
            </section>

            {challenge ? (
              <form onSubmit={handleConfirm} className="yypay:space-y-3 yypay:rounded-lg yypay:border yypay:border-border yypay:p-4">
                <p className="yypay:flex yypay:items-center yypay:gap-2 yypay:text-sm yypay:text-muted-foreground">
                  <ShieldCheck className="yypay:h-4 yypay:w-4" aria-hidden="true" />
                  {t.checkout.codeHint(formatAmount(view.amount, view.currency))}
                </p>
                <div className="yypay:space-y-2">
                  <Label htmlFor="checkout-code">{t.checkout.codeLabel}</Label>
                  <Input
                    id="checkout-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder={challenge.codePreview ?? undefined}
                    autoFocus
                  />
                </div>
                <div className="yypay:flex yypay:gap-2">
                  <Button type="submit" className="yypay:flex-1" disabled={busy || !code.trim()}>
                    {busy && <Loader2 className="yypay:h-4 yypay:w-4 yypay:animate-spin" aria-hidden="true" />}
                    {t.checkout.confirm}
                  </Button>
                  <Button type="button" variant="outline" disabled={busy} onClick={() => setChallenge(null)}>
                    {t.checkout.back}
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <fieldset className="yypay:space-y-2">
                  <legend className="yypay:mb-2 yypay:text-sm yypay:font-medium yypay:text-foreground">
                    {t.checkout.payWith}
                  </legend>
                  {wallets.map((wallet) => (
                    <label
                      key={wallet.id}
                      className="yypay:flex yypay:cursor-pointer yypay:items-center yypay:justify-between yypay:gap-3 yypay:rounded-lg yypay:border yypay:border-border yypay:p-3 yypay:has-[:checked]:border-primary"
                    >
                      <span className="yypay:flex yypay:items-center yypay:gap-2">
                        <input
                          type="radio"
                          name="checkout-wallet"
                          value={wallet.id}
                          checked={walletId === wallet.id}
                          onChange={() => setWalletId(wallet.id)}
                        />
                        <Wallet className="yypay:h-4 yypay:w-4 yypay:text-primary" aria-hidden="true" />
                        {wallet.label}
                      </span>
                      <span className="yypay:text-sm yypay:tabular-nums yypay:text-muted-foreground">
                        {t.checkout.balance(formatAmount(wallet.balance, view.currency))}
                      </span>
                    </label>
                  ))}
                </fieldset>

                {insufficient && (
                  <div role="alert" className="yypay:space-y-2 yypay:rounded-lg yypay:border yypay:border-border yypay:bg-muted/40 yypay:p-3 yypay:text-sm">
                    <p className="yypay:text-foreground">{t.checkout.insufficient}</p>
                    <div className="yypay:flex yypay:flex-wrap yypay:gap-2">
                      <Button asChild size="sm" variant="outline">
                        <a href={withBasePath(`/console/wallet?recharge=${selected?.kind === "org" ? "org" : "personal"}`)} target="_blank" rel="noopener noreferrer">
                          {t.checkout.recharge}
                        </a>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void loadWallets()}>
                        {t.checkout.refreshBalance}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="yypay:flex yypay:gap-2">
                  <Button className="yypay:flex-1" onClick={handleBuy} disabled={busy || insufficient || !walletId}>
                    {busy && <Loader2 className="yypay:h-4 yypay:w-4 yypay:animate-spin" aria-hidden="true" />}
                    {t.checkout.buy} · {formatAmount(view.amount, view.currency)}
                  </Button>
                  <Button variant="outline" onClick={handleCancel} disabled={busy}>
                    {t.checkout.cancel}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
