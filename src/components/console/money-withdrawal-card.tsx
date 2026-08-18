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
import { bffPost } from "@/lib/bff-client";
import { Banknote, ShieldCheck } from "lucide-react";
import { useState } from "react";
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
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [method, setMethod] = useState<string>(METHODS[0].value);
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

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
      toast.success("Un code de validation vous a été envoyé.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible d'envoyer le code",
      );
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
      toast.success("Retrait envoyé.");
      reset();
      onDone?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Le retrait a échoué",
      );
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
          <Banknote className="yypay:h-5 yypay:w-5" />
          Retirer de l&apos;argent
        </CardTitle>
        <CardDescription>
          Vers votre compte mobile money. Le nom du titulaire est vérifié avant
          l&apos;envoi.
        </CardDescription>
      </CardHeader>
      <CardContent className="yypay:space-y-4">
        <div className="yypay:space-y-2">
          <Label htmlFor="withdraw-amount">Montant</Label>
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
          <Label htmlFor="withdraw-method">Opérateur</Label>
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
          <Label htmlFor="withdraw-phone">Numéro du bénéficiaire</Label>
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
          <Label htmlFor="withdraw-name">Nom du titulaire</Label>
          <Input
            id="withdraw-name"
            value={recipientName}
            disabled={Boolean(challenge) || busy}
            onChange={(event) => setRecipientName(event.target.value)}
            placeholder="Tel qu'enregistré chez l'opérateur"
          />
        </div>

        {challenge ? (
          <div className="yypay:space-y-3 yypay:rounded-lg yypay:border yypay:border-border yypay:p-4">
            <p className="yypay:flex yypay:items-center yypay:gap-2 yypay:text-sm yypay:text-secondary">
              <ShieldCheck className="yypay:h-4 yypay:w-4" />
              Saisissez le code reçu pour confirmer.
            </p>
            <Input
              value={code}
              inputMode="numeric"
              onChange={(event) => setCode(event.target.value)}
              placeholder="Code de validation"
            />
            <div className="yypay:flex yypay:gap-2">
              <Button
                onClick={confirmWithdrawal}
                disabled={busy || code.trim().length === 0}
              >
                Confirmer le retrait
              </Button>
              <Button variant="outline" onClick={reset} disabled={busy}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={requestCode} disabled={!canRequest || busy}>
            Recevoir le code de validation
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
