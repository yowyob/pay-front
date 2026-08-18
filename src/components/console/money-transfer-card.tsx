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
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type MoneyTransferCardProps = {
  walletId?: string | null;
  onDone?: () => void;
};

type ChallengeResponse = {
  challengeToken: string;
  expiresInSeconds: number;
  codePreview?: string | null;
};

/**
 * Transfert vers un autre portefeuille, en deux temps : le kernel envoie un code au second
 * facteur, puis le transfert n'est exécuté qu'avec ce code. Le montant et le destinataire
 * sont figés une fois le code demandé — les modifier invalide le code côté serveur, donc on
 * verrouille les champs pour éviter un échec incompréhensible.
 */
export function MoneyTransferCard({ walletId, onDone }: MoneyTransferCardProps) {
  const [targetWalletId, setTargetWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

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
      toast.success("Un code de validation vous a été envoyé.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible d'envoyer le code",
      );
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
      toast.success("Transfert effectué.");
      reset();
      onDone?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Le transfert a échoué",
      );
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
          <ArrowUpRight className="yypay:h-5 yypay:w-5" />
          Transférer de l&apos;argent
        </CardTitle>
        <CardDescription>
          Vers un autre portefeuille. Une validation par code est demandée.
        </CardDescription>
      </CardHeader>
      <CardContent className="yypay:space-y-4">
        <div className="yypay:space-y-2">
          <Label htmlFor="transfer-target">Portefeuille destinataire</Label>
          <Input
            id="transfer-target"
            value={targetWalletId}
            disabled={Boolean(challenge) || busy}
            onChange={(event) => setTargetWalletId(event.target.value)}
            placeholder="Identifiant du portefeuille"
          />
        </div>

        <div className="yypay:space-y-2">
          <Label htmlFor="transfer-amount">Montant</Label>
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
          <Label htmlFor="transfer-reference">Motif (facultatif)</Label>
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
                onClick={confirmTransfer}
                disabled={busy || code.trim().length === 0}
              >
                Confirmer le transfert
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
