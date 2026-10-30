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
import { bffPost } from "@/lib/bff-client";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** Portefeuille d'où l'argent peut partir (celui de l'organisation, le sien). */
export type TransferSource = {
  id: string;
  label: string;
};

type MoneyTransferCardProps = {
  sources: TransferSource[];
  onDone?: () => void;
};

type ChallengeResponse = {
  challengeToken: string;
  expiresInSeconds: number;
  codePreview?: string | null;
};

/**
 * Transfert vers un autre portefeuille, en deux temps : le kernel envoie un code au second
 * facteur, puis le transfert n'est exécuté qu'avec ce code. La source, le montant et le
 * destinataire sont figés une fois le code demandé — les modifier invalide le code côté serveur,
 * donc on verrouille les champs pour éviter un échec incompréhensible.
 */
export function MoneyTransferCard({ sources, onDone }: MoneyTransferCardProps) {
  const { t } = useLocale();
  const [sourceId, setSourceId] = useState("");
  const [targetWalletId, setTargetWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const walletId = sources.some((source) => source.id === sourceId)
    ? sourceId
    : sources[0]?.id;
  const canRequest =
    Boolean(walletId) && targetWalletId.trim().length > 0 && Number(amount) > 0;

  async function requestCode() {
    if (!walletId) return;
    setBusy(true);
    try {
      const result = await bffPost<ChallengeResponse>(
        `/api/payments/wallets/${walletId}/transfers/challenge`,
        {
          targetWalletId: targetWalletId.trim(),
          amount: Number(amount),
          reference: reference.trim() || undefined,
        },
      );
      setChallenge(result);
      toast.success(t.walletOps.codeSent);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.walletOps.sendCodeError);
    } finally {
      setBusy(false);
    }
  }

  async function confirmTransfer() {
    if (!walletId || !challenge) return;
    setBusy(true);
    try {
      await bffPost(`/api/payments/wallets/${walletId}/transfers`, {
        targetWalletId: targetWalletId.trim(),
        amount: Number(amount),
        reference: reference.trim() || undefined,
        challengeToken: challenge.challengeToken,
        code: code.trim(),
      });
      toast.success(t.walletOps.transferSuccess);
      reset();
      onDone?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.walletOps.transferError);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setChallenge(null);
    setCode("");
    setAmount("");
    setTargetWalletId("");
    setReference("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="yypay:flex yypay:items-center yypay:gap-2">
          <ArrowUpRight className="yypay:h-5 yypay:w-5" aria-hidden="true" />
          {t.walletOps.transferTitle}
        </CardTitle>
        <CardDescription>{t.walletOps.transferDescription}</CardDescription>
      </CardHeader>
      <CardContent className="yypay:space-y-4">
        {sources.length > 1 && (
          <div className="yypay:space-y-2">
            <Label htmlFor="transfer-source">{t.walletOps.transferSource}</Label>
            <select
              id="transfer-source"
              value={walletId ?? ""}
              disabled={Boolean(challenge) || busy}
              onChange={(event) => setSourceId(event.target.value)}
              className="yypay:h-9 yypay:w-full yypay:rounded-md yypay:border yypay:border-border yypay:bg-background yypay:px-3 yypay:text-sm yypay:text-foreground"
            >
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="yypay:space-y-2">
          <Label htmlFor="transfer-target">{t.walletOps.transferTarget}</Label>
          <Input
            id="transfer-target"
            value={targetWalletId}
            disabled={Boolean(challenge) || busy}
            onChange={(event) => setTargetWalletId(event.target.value)}
            placeholder={t.walletOps.transferTargetPlaceholder}
          />
        </div>

        <div className="yypay:space-y-2">
          <Label htmlFor="transfer-amount">{t.walletOps.amount}</Label>
          <Input
            id="transfer-amount"
            type="number"
            min="1"
            value={amount}
            disabled={Boolean(challenge) || busy}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>

        <div className="yypay:space-y-2">
          <Label htmlFor="transfer-reference">{t.walletOps.transferReason}</Label>
          <Input
            id="transfer-reference"
            value={reference}
            disabled={Boolean(challenge) || busy}
            onChange={(event) => setReference(event.target.value)}
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
                onClick={confirmTransfer}
                disabled={busy || code.trim().length === 0}
              >
                {t.walletOps.transferConfirm}
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
    </Card>
  );
}
