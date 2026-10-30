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
import { useLocale } from "@/i18n/locale-provider";
import { bffGet, bffPost } from "@/lib/bff-client";
import { Banknote, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type MoneyWithdrawalCardProps = {
  walletId?: string | null;
  currency?: string | null;
  onDone?: () => void;
};

type ChallengeResponse = {
  challengeToken: string;
  expiresInSeconds: number;
  codePreview?: string | null;
};

const METHODS = [
  { value: "ORANGE_MONEY", label: "Orange Money" },
  { value: "MTN_MOBILE_MONEY", label: "MTN Mobile Money" },
] as const;

/**
 * Retrait vers un compte mobile money. Le nom du titulaire est saisi puis confronté côté
 * kernel à ce que l'opérateur connaît : un numéro mal saisi ne doit pas envoyer l'argent à
 * un inconnu.
 */
export function MoneyWithdrawalCard({
  walletId,
  currency,
  onDone,
}: MoneyWithdrawalCardProps) {
  const { t } = useLocale();
  // Retrait fermé tant que le versement du prestataire n'est pas configuré côté noyau : on le dit
  // au lieu d'envoyer un code qui mènerait au même refus. Inconnu (null) : formulaire affiché.
  const [available, setAvailable] = useState<boolean | null>(null);
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [method, setMethod] = useState<string>(METHODS[0].value);
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    bffGet<{ available?: boolean }>("/api/payments/withdrawals/availability")
      .then((result) => {
        if (!cancelled) setAvailable(result?.available !== false);
      })
      .catch(() => {
        if (!cancelled) setAvailable(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const canRequest =
    Boolean(walletId) &&
    Number(amount) > 0 &&
    phoneNumber.trim().length > 0 &&
    recipientName.trim().length > 0;

  async function requestCode() {
    if (!walletId) return;
    setBusy(true);
    try {
      const result = await bffPost<ChallengeResponse>(
        `/api/payments/wallets/${walletId}/withdrawals/challenge`,
        { amount: Number(amount), phoneNumber: phoneNumber.trim() },
      );
      setChallenge(result);
      toast.success(t.walletOps.codeSent);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.walletOps.sendCodeError);
    } finally {
      setBusy(false);
    }
  }

  async function confirmWithdrawal() {
    if (!walletId || !challenge) return;
    setBusy(true);
    try {
      await bffPost(`/api/payments/wallets/${walletId}/withdrawals`, {
        amount: Number(amount),
        currency: currency ?? "XAF",
        phoneNumber: phoneNumber.trim(),
        method,
        recipientName: recipientName.trim(),
        challengeToken: challenge.challengeToken,
        code: code.trim(),
      });
      toast.success(t.walletOps.withdrawalSuccess);
      reset();
      onDone?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.walletOps.withdrawalError);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setChallenge(null);
    setCode("");
    setAmount("");
    setPhoneNumber("");
    setRecipientName("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="yypay:flex yypay:items-center yypay:gap-2">
          <Banknote className="yypay:h-5 yypay:w-5" aria-hidden="true" />
          {t.walletOps.withdrawalTitle}
        </CardTitle>
        <CardDescription>{t.walletOps.withdrawalDescription}</CardDescription>
      </CardHeader>
      {available === false ? (
        <CardContent>
          <p className="yypay:rounded-lg yypay:border yypay:border-border yypay:bg-muted/40 yypay:p-3 yypay:text-sm yypay:text-muted-foreground">
            {t.walletOps.withdrawalUnavailable}
          </p>
        </CardContent>
      ) : (
      <CardContent className="yypay:space-y-4">
        <div className="yypay:space-y-2">
          <Label htmlFor="withdraw-amount">{t.walletOps.amount}</Label>
          <Input
            id="withdraw-amount"
            type="number"
            min="1"
            value={amount}
            disabled={Boolean(challenge) || busy}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>

        <div className="yypay:space-y-2">
          <Label htmlFor="withdraw-method">{t.walletOps.withdrawalOperator}</Label>
          <select
            id="withdraw-method"
            value={method}
            disabled={Boolean(challenge) || busy}
            onChange={(event) => setMethod(event.target.value)}
            className="yypay:h-9 yypay:w-full yypay:rounded-md yypay:border yypay:border-border yypay:bg-background yypay:px-3 yypay:text-sm yypay:text-foreground"
          >
            {METHODS.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>

        <div className="yypay:space-y-2">
          <Label htmlFor="withdraw-phone">{t.walletOps.withdrawalPhone}</Label>
          <Input
            id="withdraw-phone"
            inputMode="tel"
            value={phoneNumber}
            disabled={Boolean(challenge) || busy}
            onChange={(event) => setPhoneNumber(event.target.value)}
            placeholder="6XXXXXXXX"
          />
        </div>

        <div className="yypay:space-y-2">
          <Label htmlFor="withdraw-name">{t.walletOps.withdrawalHolder}</Label>
          <Input
            id="withdraw-name"
            value={recipientName}
            disabled={Boolean(challenge) || busy}
            onChange={(event) => setRecipientName(event.target.value)}
            placeholder={t.walletOps.withdrawalHolderPlaceholder}
          />
        </div>

        {challenge ? (
          <div className="yypay:space-y-3 yypay:rounded-lg yypay:border yypay:border-border yypay:p-4">
            <p className="yypay:flex yypay:items-center yypay:gap-2 yypay:text-sm yypay:text-secondary">
              <ShieldCheck className="yypay:h-4 yypay:w-4" aria-hidden="true" />
              {t.walletOps.codeHint}
            </p>
            <Input
              value={code}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label={t.walletOps.codePlaceholder}
              onChange={(event) => setCode(event.target.value)}
              placeholder={t.walletOps.codePlaceholder}
            />
            <div className="yypay:flex yypay:gap-2">
              <Button
                onClick={confirmWithdrawal}
                disabled={busy || code.trim().length === 0}
              >
                {t.walletOps.withdrawalConfirm}
              </Button>
              <Button variant="outline" onClick={reset} disabled={busy}>
                {t.walletOps.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={requestCode} disabled={!canRequest || busy}>
            {t.walletOps.requestCode}
          </Button>
        )}
      </CardContent>
      )}
    </Card>
  );
}
