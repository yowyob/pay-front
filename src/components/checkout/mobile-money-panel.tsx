"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/locale-provider";
import { bffPost } from "@/lib/bff-client";
import { Loader2, Smartphone } from "lucide-react";
import { useCallback, useRef, useState } from "react";

/**
 * Règlement d'un achat par mobile money, pour un acheteur SANS compte Yowyob.
 *
 * Ce n'est pas le geste du comptoir : ici l'acheteur est DEVANT l'écran. Le chemin principal est
 * donc le lien vers le prestataire, ouvert dans un autre onglet pour que cette page continue de
 * vivre et d'interroger ; le QR n'est que le secours de celui qui lit sur un ordinateur et paie
 * avec son téléphone.
 *
 * C'est bien cette page qui interroge : l'acheteur valide chez MyCoolPay, et aucune de nos pages
 * n'est rechargée à ce moment-là.
 */

type EtatReglement =
  | "PENDING_PAYMENT"
  | "SETTLED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUND_DUE";

type Ouverture = {
  paymentUrl?: string | null;
  qrCode?: string | null;
  status?: string | null;
  amount?: number | null;
  currency?: string | null;
};

/** Le noyau refuse de rappeler le prestataire plus d'une fois toutes les 3 s : on reste au-dessus. */
const CADENCE_MS = 4000;

/** Au-delà, on cesse d'interroger sans rien conclure : la réconciliation du noyau fait le reste. */
const DUREE_MAX_MS = 10 * 60_000;

export default function MobileMoneyPanel({
  sessionId,
  amount,
  currency,
  formatAmount,
  onSettled,
}: {
  sessionId: string;
  amount: number;
  currency: string;
  formatAmount: (value: number, currency: string) => string;
  /** Appelé UNE SEULE FOIS, quand le vendeur est crédité : la page relit alors l'achat. */
  onSettled: () => void;
}) {
  const { t } = useLocale();
  const m = t.checkout.mobileMoney;
  const [ouverture, setOuverture] = useState<Ouverture | null>(null);
  const [etat, setEtat] = useState<EtatReglement>("PENDING_PAYMENT");
  const [ouvre, setOuvre] = useState(false);
  const [sondage, setSondage] = useState(false);
  const [cadenceLibre, setCadenceLibre] = useState(true);
  const [abandonne, setAbandonne] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);
  const dejaAnnonce = useRef(false);
  const minuterie = useRef<number | null>(null);

  const arreterLaBoucle = useCallback(() => {
    if (minuterie.current !== null) {
      globalThis.clearInterval(minuterie.current);
      minuterie.current = null;
    }
  }, []);

  const sonder = useCallback(async (): Promise<EtatReglement | null> => {
    setSondage(true);
    setCadenceLibre(false);
    try {
      const issue = await bffPost<{ status?: string | null }>(
        `/api/checkout/${encodeURIComponent(sessionId)}/refresh`,
      );
      const suivant = (issue?.status ?? "PENDING_PAYMENT") as EtatReglement;
      setRefus(null);
      setEtat(suivant);
      if (suivant === "SETTLED" && !dejaAnnonce.current) {
        dejaAnnonce.current = true;
        onSettled();
      }
      return suivant;
    } catch (error) {
      // Un réseau qui hoquette n'est pas un refus de paiement : on le dit et on continue
      // d'interroger. Conclure « échec » ici ferait croire l'achat perdu alors qu'il est payé.
      setRefus(error instanceof Error && error.message.trim() ? error.message : m.retrying);
      return null;
    } finally {
      setSondage(false);
      globalThis.setTimeout(() => setCadenceLibre(true), CADENCE_MS);
    }
  }, [sessionId, onSettled, m]);

  const lancerLaBoucle = useCallback(() => {
    const depart = Date.now();
    arreterLaBoucle();
    minuterie.current = globalThis.setInterval(() => {
      if (Date.now() - depart > DUREE_MAX_MS) {
        setAbandonne(true);
        arreterLaBoucle();
        return;
      }
      void sonder().then((suivant) => {
        if (suivant && suivant !== "PENDING_PAYMENT") arreterLaBoucle();
      });
    }, CADENCE_MS) as unknown as number;
  }, [sonder, arreterLaBoucle]);

  async function ouvrirLePaiement() {
    setOuvre(true);
    setRefus(null);
    try {
      const resultat = await bffPost<Ouverture>(
        `/api/checkout/${encodeURIComponent(sessionId)}/mobile-money`,
        {},
      );
      if (!resultat?.paymentUrl) {
        throw new Error(t.checkout.error);
      }
      setOuverture(resultat);
      setEtat((resultat.status ?? "PENDING_PAYMENT") as EtatReglement);
      lancerLaBoucle();
    } catch (error) {
      setRefus(error instanceof Error && error.message.trim() ? error.message : t.checkout.error);
    } finally {
      setOuvre(false);
    }
  }

  const phrase = (() => {
    switch (etat) {
      case "SETTLED":
        return { ton: "bon" as const, texte: m.paid };
      case "FAILED":
        return { ton: "mauvais" as const, texte: m.failed };
      case "CANCELLED":
        return { ton: "mauvais" as const, texte: m.cancelled };
      case "EXPIRED":
        return { ton: "mauvais" as const, texte: m.expired };
      case "REFUND_DUE":
        return { ton: "mauvais" as const, texte: m.refundDue };
      default:
        return { ton: "attente" as const, texte: m.waiting };
    }
  })();
  const termine = etat !== "PENDING_PAYMENT";

  if (!ouverture) {
    return (
      <section aria-label={m.title} className="yypay:space-y-2">
        <Button
          variant="outline"
          className="yypay:w-full"
          onClick={() => void ouvrirLePaiement()}
          disabled={ouvre}
        >
          {ouvre ? (
            <Loader2 className="yypay:h-4 yypay:w-4 yypay:animate-spin" aria-hidden="true" />
          ) : (
            <Smartphone className="yypay:h-4 yypay:w-4" aria-hidden="true" />
          )}
          {ouvre ? m.opening : m.open}
        </Button>
        <p className="yypay:text-xs yypay:text-muted-foreground">{m.intro}</p>
        {refus ? (
          <p role="alert" className="yypay:text-xs yypay:text-destructive">
            {refus}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section
      aria-label={m.title}
      className="yypay:space-y-4 yypay:rounded-lg yypay:border yypay:border-border yypay:p-4"
    >
      <div
        role="status"
        aria-live="polite"
        className={
          phrase.ton === "bon"
            ? "yypay:rounded-md yypay:bg-emerald-500/10 yypay:p-3 yypay:text-sm yypay:text-emerald-700"
            : phrase.ton === "mauvais"
              ? "yypay:rounded-md yypay:bg-destructive/10 yypay:p-3 yypay:text-sm yypay:text-destructive"
              : "yypay:rounded-md yypay:bg-muted yypay:p-3 yypay:text-sm yypay:text-muted-foreground"
        }
      >
        {phrase.texte}
      </div>

      {!termine ? (
        <>
          <Button asChild className="yypay:w-full">
            <a href={ouverture.paymentUrl ?? "#"} target="_blank" rel="noopener noreferrer">
              {m.continueToProvider} · {formatAmount(amount, currency)}
            </a>
          </Button>

          {ouverture.qrCode ? (
            <figure className="yypay:space-y-2 yypay:text-center">
              {/* Fond blanc imposé : un QR noir sur fond sombre ne se lit pas. L'image vient du
                  `data:` de la réponse, et non de la route PNG, pour ne dépendre d'aucun relais. */}
              <div className="yypay:mx-auto yypay:w-fit yypay:rounded-xl yypay:border yypay:border-border yypay:bg-white yypay:p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ouverture.qrCode}
                  alt={m.scanAlt(formatAmount(amount, currency))}
                  width={200}
                  height={200}
                  className="yypay:h-50 yypay:w-50"
                />
              </div>
              <figcaption className="yypay:text-xs yypay:text-muted-foreground">
                {m.scanHint}
              </figcaption>
            </figure>
          ) : null}

          <div className="yypay:flex yypay:flex-wrap yypay:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void sonder()}
              disabled={sondage || !cadenceLibre}
            >
              {sondage ? (
                <Loader2 className="yypay:h-4 yypay:w-4 yypay:animate-spin" aria-hidden="true" />
              ) : null}
              {m.check}
            </Button>
          </div>

          {refus ? (
            <p role="alert" className="yypay:text-xs yypay:text-muted-foreground">
              {refus}
            </p>
          ) : null}
          {abandonne ? (
            <p className="yypay:rounded-md yypay:bg-muted yypay:p-3 yypay:text-xs yypay:text-muted-foreground">
              {m.gaveUp}
            </p>
          ) : null}
          <p className="yypay:text-xs yypay:text-muted-foreground">{m.keepOpen}</p>
        </>
      ) : null}
    </section>
  );
}
