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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useLocale } from "@/i18n/locale-provider";
import { BffError, bffDelete, bffGet, bffPost } from "@/lib/bff-client";
import { Banknote, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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

/** Numéro de retrait tel que le rend le kernel : jamais en clair. */
type PayoutNumber = {
  id: string;
  maskedPhone: string;
  operator: "ORANGE" | "MTN";
  status: "PENDING" | "VERIFIED";
  codeExpiresAt?: string | null;
  verifiedAt?: string | null;
};

const METHODS = [
  { value: "ORANGE_MONEY", label: "Orange Money" },
  { value: "MTN_MOBILE_MONEY", label: "MTN Mobile Money" },
] as const;

const OPERATOR_LABELS: Record<PayoutNumber["operator"], string> = {
  ORANGE: "Orange Money",
  MTN: "MTN Mobile Money",
};

const SELECT_CLASS =
  "yypay:h-9 yypay:w-full yypay:rounded-md yypay:border yypay:border-border yypay:bg-background yypay:px-3 yypay:text-sm yypay:text-foreground";

/**
 * Numéros de retrait du portefeuille. {@code "legacy"} quand le kernel ne connaît pas encore les
 * numéros vérifiés (404) ; {@code null} tant que le portefeuille n'est pas connu.
 */
async function fetchPayoutNumbers(
  walletId?: string | null,
): Promise<PayoutNumber[] | "legacy" | null> {
  if (!walletId) return null;
  try {
    const list = await bffGet<PayoutNumber[]>(
      `/api/payments/wallets/${encodeURIComponent(walletId)}/payout-numbers`,
    );
    return Array.isArray(list) ? list : [];
  } catch (error) {
    return error instanceof BffError && error.status === 404 ? "legacy" : [];
  }
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Retrait vers un compte mobile money.
 *
 * Un retrait ne part que vers un numéro vérifié : on l'ajoute, un code arrive par SMS sur ce
 * numéro, on le saisit. La détention du numéro est ainsi prouvée, et une faute de frappe ne peut
 * plus envoyer l'argent à un inconnu. Le retrait désigne ensuite le numéro par son identifiant :
 * le kernel ne le rend jamais en clair, il n'est donc jamais ressaisi.
 *
 * Si le kernel ne connaît pas encore les numéros vérifiés (404), l'ancien formulaire est gardé :
 * numéro et nom du titulaire, vérifié auprès de l'opérateur.
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
  // null : pas encore chargé ; "legacy" : kernel sans numéros vérifiés.
  const [numbers, setNumbers] = useState<PayoutNumber[] | "legacy" | null>(null);

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

  const loadNumbers = useCallback(async () => {
    setNumbers(await fetchPayoutNumbers(walletId));
  }, [walletId]);

  useEffect(() => {
    let cancelled = false;
    fetchPayoutNumbers(walletId).then((result) => {
      if (!cancelled) setNumbers(result);
    });
    return () => {
      cancelled = true;
    };
  }, [walletId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="yypay:flex yypay:items-center yypay:gap-2">
          <Banknote className="yypay:h-5 yypay:w-5" aria-hidden="true" />
          {t.walletOps.withdrawalTitle}
        </CardTitle>
        <CardDescription>
          {numbers === "legacy"
            ? t.walletOps.withdrawalDescription
            : t.walletOps.payoutNumbersDescription}
        </CardDescription>
      </CardHeader>
      {available === false ? (
        <CardContent>
          <p className="yypay:rounded-lg yypay:border yypay:border-border yypay:bg-muted/40 yypay:p-3 yypay:text-sm yypay:text-muted-foreground">
            {t.walletOps.withdrawalUnavailable}
          </p>
        </CardContent>
      ) : numbers === "legacy" ? (
        <LegacyWithdrawalForm walletId={walletId} currency={currency} onDone={onDone} />
      ) : (
        <CardContent className="yypay:space-y-6">
          <PayoutNumbersSection
            walletId={walletId}
            numbers={numbers ?? []}
            onChanged={loadNumbers}
          />
          <Separator />
          <VerifiedWithdrawalForm
            walletId={walletId}
            currency={currency}
            verified={(numbers ?? []).filter((n) => n.status === "VERIFIED")}
            onDone={onDone}
          />
        </CardContent>
      )}
    </Card>
  );
}

/** Liste des numéros, ajout d'un numéro et confirmation par le code reçu par SMS. */
function PayoutNumbersSection({
  walletId,
  numbers,
  onChanged,
}: {
  walletId?: string | null;
  numbers: PayoutNumber[];
  onChanged: () => Promise<void>;
}) {
  const { t } = useLocale();
  const [method, setMethod] = useState<string>(METHODS[0].value);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [codes, setCodes] = useState<Record<string, string>>({});
  // Numéro saisi pendant la session, pour pouvoir renvoyer un code : le kernel ne le rend pas.
  const [typed, setTyped] = useState<Record<string, { phone: string; method: string }>>({});
  const [busy, setBusy] = useState(false);

  const base = walletId
    ? `/api/payments/wallets/${encodeURIComponent(walletId)}/payout-numbers`
    : null;

  async function addNumber(phone: string, operatorMethod: string) {
    if (!base) return;
    setBusy(true);
    try {
      const added = await bffPost<PayoutNumber>(base, {
        phoneNumber: phone,
        method: operatorMethod,
      });
      if (added?.id) {
        setTyped((current) => ({ ...current, [added.id]: { phone, method: operatorMethod } }));
      }
      toast.success(
        added?.status === "VERIFIED"
          ? t.walletOps.payoutNumberAlreadyVerified
          : t.walletOps.payoutNumberCodeSent,
      );
      setPhoneNumber("");
      await onChanged();
    } catch (error) {
      toast.error(errorMessage(error, t.walletOps.payoutNumberAddError));
    } finally {
      setBusy(false);
    }
  }

  async function verify(number: PayoutNumber) {
    if (!base) return;
    setBusy(true);
    try {
      await bffPost(`${base}/${encodeURIComponent(number.id)}/verify`, {
        code: (codes[number.id] ?? "").trim(),
      });
      toast.success(t.walletOps.payoutNumberVerified);
      setCodes((current) => ({ ...current, [number.id]: "" }));
      await onChanged();
    } catch (error) {
      toast.error(errorMessage(error, t.walletOps.payoutNumberVerifyError));
    } finally {
      setBusy(false);
    }
  }

  async function remove(number: PayoutNumber) {
    if (!base) return;
    setBusy(true);
    try {
      await bffDelete(`${base}/${encodeURIComponent(number.id)}`);
      toast.success(t.walletOps.payoutNumberRemoved);
      await onChanged();
    } catch (error) {
      toast.error(errorMessage(error, t.walletOps.payoutNumberRemoveError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="yypay:space-y-4">
      <h3 className="yypay:flex yypay:items-center yypay:gap-2 yypay:text-sm yypay:font-semibold yypay:text-foreground">
        <Smartphone className="yypay:h-4 yypay:w-4" aria-hidden="true" />
        {t.walletOps.payoutNumbersTitle}
      </h3>

      {numbers.length === 0 ? (
        <p className="yypay:text-sm yypay:text-muted-foreground">
          {t.walletOps.payoutNumbersEmpty}
        </p>
      ) : (
        <ul className="yypay:space-y-3">
          {numbers.map((number) => {
            const pending = number.status === "PENDING";
            const known = typed[number.id];
            return (
              <li
                key={number.id}
                className="yypay:space-y-3 yypay:rounded-lg yypay:border yypay:border-border yypay:p-3"
              >
                <div className="yypay:flex yypay:items-center yypay:justify-between yypay:gap-2">
                  <div className="yypay:min-w-0">
                    <p className="yypay:font-medium yypay:text-foreground">{number.maskedPhone}</p>
                    <p className="yypay:text-xs yypay:text-muted-foreground">
                      {OPERATOR_LABELS[number.operator] ?? number.operator}
                    </p>
                  </div>
                  <div className="yypay:flex yypay:items-center yypay:gap-2">
                    <Badge variant={pending ? "secondary" : "success"}>
                      {pending ? t.walletOps.payoutNumberPending : t.walletOps.payoutNumberVerifiedBadge}
                    </Badge>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={t.walletOps.payoutNumberRemove}
                      title={t.walletOps.payoutNumberRemove}
                      disabled={busy}
                      onClick={() => remove(number)}
                    >
                      <Trash2 className="yypay:h-4 yypay:w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                {pending ? (
                  <div className="yypay:space-y-2">
                    <Label htmlFor={`payout-code-${number.id}`}>
                      {t.walletOps.payoutNumberCodeLabel}
                    </Label>
                    <div className="yypay:flex yypay:flex-wrap yypay:gap-2">
                      <Input
                        id={`payout-code-${number.id}`}
                        className="yypay:w-36"
                        value={codes[number.id] ?? ""}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="123456"
                        disabled={busy}
                        onChange={(event) =>
                          setCodes((current) => ({ ...current, [number.id]: event.target.value }))
                        }
                      />
                      <Button
                        onClick={() => verify(number)}
                        disabled={busy || (codes[number.id] ?? "").trim().length !== 6}
                      >
                        {t.walletOps.payoutNumberVerify}
                      </Button>
                      {known ? (
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() => addNumber(known.phone, known.method)}
                        >
                          {t.walletOps.payoutNumberResend}
                        </Button>
                      ) : null}
                    </div>
                    <p className="yypay:text-xs yypay:text-muted-foreground">
                      {known ? t.walletOps.payoutNumberCodeHint : t.walletOps.payoutNumberResendHint}
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="yypay:space-y-3 yypay:rounded-lg yypay:border yypay:border-dashed yypay:border-border yypay:p-3">
        <p className="yypay:text-sm yypay:font-medium yypay:text-foreground">
          {t.walletOps.payoutNumberAddTitle}
        </p>
        <div className="yypay:grid yypay:grid-cols-1 yypay:gap-3 yypay:sm:grid-cols-2">
          <div className="yypay:space-y-2">
            <Label htmlFor="payout-method">{t.walletOps.withdrawalOperator}</Label>
            <select
              id="payout-method"
              value={method}
              disabled={busy}
              onChange={(event) => setMethod(event.target.value)}
              className={SELECT_CLASS}
            >
              {METHODS.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>
          <div className="yypay:space-y-2">
            <Label htmlFor="payout-phone">{t.walletOps.payoutNumberPhone}</Label>
            <Input
              id="payout-phone"
              inputMode="tel"
              value={phoneNumber}
              disabled={busy}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="6XXXXXXXX"
            />
          </div>
        </div>
        <Button
          variant="outline"
          disabled={busy || !walletId || phoneNumber.trim().length === 0}
          onClick={() => addNumber(phoneNumber.trim(), method)}
        >
          {t.walletOps.payoutNumberSendCode}
        </Button>
      </div>
    </div>
  );
}

/** Retrait vers un numéro vérifié, désigné par son identifiant, confirmé par le second facteur. */
function VerifiedWithdrawalForm({
  walletId,
  currency,
  verified,
  onDone,
}: {
  walletId?: string | null;
  currency?: string | null;
  verified: PayoutNumber[];
  onDone?: () => void;
}) {
  const { t } = useLocale();
  const [numberId, setNumberId] = useState("");
  const [amount, setAmount] = useState("");
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  // Le numéro choisi doit rester un numéro vérifié (il peut avoir été retiré entre-temps).
  const selected = verified.find((n) => n.id === numberId) ?? verified[0];

  if (verified.length === 0) {
    return (
      <p className="yypay:rounded-lg yypay:border yypay:border-border yypay:bg-muted/40 yypay:p-3 yypay:text-sm yypay:text-muted-foreground">
        {t.walletOps.payoutNumberRequired}
      </p>
    );
  }

  const base = walletId && selected
    ? `/api/payments/wallets/${encodeURIComponent(walletId)}/payout-numbers/${encodeURIComponent(selected.id)}/withdrawals`
    : null;

  async function requestCode() {
    if (!base) return;
    setBusy(true);
    try {
      const result = await bffPost<ChallengeResponse>(`${base}/challenge`, {
        amount: Number(amount),
      });
      setChallenge(result);
      toast.success(t.walletOps.codeSent);
    } catch (error) {
      toast.error(errorMessage(error, t.walletOps.sendCodeError));
    } finally {
      setBusy(false);
    }
  }

  async function confirmWithdrawal() {
    if (!base || !challenge) return;
    setBusy(true);
    try {
      await bffPost(base, {
        amount: Number(amount),
        currency: currency ?? "XAF",
        challengeToken: challenge.challengeToken,
        code: code.trim(),
      });
      toast.success(t.walletOps.withdrawalSuccess);
      reset();
      onDone?.();
    } catch (error) {
      toast.error(errorMessage(error, t.walletOps.withdrawalError));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setChallenge(null);
    setCode("");
    setAmount("");
  }

  return (
    <div className="yypay:space-y-4">
      <div className="yypay:space-y-2">
        <Label htmlFor="withdraw-number">{t.walletOps.withdrawalTo}</Label>
        <select
          id="withdraw-number"
          value={selected?.id ?? ""}
          disabled={Boolean(challenge) || busy}
          onChange={(event) => setNumberId(event.target.value)}
          className={SELECT_CLASS}
        >
          {verified.map((n) => (
            <option key={n.id} value={n.id}>
              {n.maskedPhone} · {OPERATOR_LABELS[n.operator] ?? n.operator}
            </option>
          ))}
        </select>
      </div>

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

      {challenge ? (
        <CodeConfirmation
          code={code}
          busy={busy}
          onCode={setCode}
          onConfirm={confirmWithdrawal}
          onCancel={reset}
        />
      ) : (
        <Button onClick={requestCode} disabled={busy || !selected || !(Number(amount) > 0)}>
          {t.walletOps.requestCode}
        </Button>
      )}
    </div>
  );
}

function CodeConfirmation({
  code,
  busy,
  onCode,
  onConfirm,
  onCancel,
}: {
  code: string;
  busy: boolean;
  onCode: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  return (
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
        onChange={(event) => onCode(event.target.value)}
        placeholder={t.walletOps.codePlaceholder}
      />
      <div className="yypay:flex yypay:gap-2">
        <Button onClick={onConfirm} disabled={busy || code.trim().length === 0}>
          {t.walletOps.withdrawalConfirm}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          {t.walletOps.cancel}
        </Button>
      </div>
    </div>
  );
}

/** Kernel sans numéros vérifiés : numéro et nom du titulaire, vérifié auprès de l'opérateur. */
function LegacyWithdrawalForm({
  walletId,
  currency,
  onDone,
}: MoneyWithdrawalCardProps) {
  const { t } = useLocale();
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
      toast.success(t.walletOps.codeSent);
    } catch (error) {
      toast.error(errorMessage(error, t.walletOps.sendCodeError));
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
      toast.error(errorMessage(error, t.walletOps.withdrawalError));
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
          className={SELECT_CLASS}
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
        <CodeConfirmation
          code={code}
          busy={busy}
          onCode={setCode}
          onConfirm={confirmWithdrawal}
          onCancel={reset}
        />
      ) : (
        <Button onClick={requestCode} disabled={!canRequest || busy}>
          {t.walletOps.requestCode}
        </Button>
      )}
    </CardContent>
  );
}
