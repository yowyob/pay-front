"use client";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { YOWAUTH_LOGIN_URL } from "@/lib/external-auth";
import {
  Building2,
  Check,
  CreditCard,
  Lock,
  Minus,
  ShoppingCart,
} from "lucide-react";

const STEPS = [
  {
    icon: Lock,
    title: "Connexion sécurisée",
    description: "Authentification à deux facteurs pour protéger votre compte.",
  },
  {
    icon: Building2,
    title: "Choisir votre organisation",
    description: "Sélectionnez le contexte organisationnel à gérer.",
  },
  {
    icon: CreditCard,
    title: "Wallet & services",
    description: "Consultez votre solde, vos transactions et vos abonnements.",
  },
  {
    icon: ShoppingCart,
    title: "Payer simplement",
    description: "Paiement sécurisé prélevé sur le solde de votre portefeuille.",
  },
];

const BENCHMARK_COLUMNS = ["YowYob Payment", "Paiement classique", "Espèces"];

const BENCHMARK_ROWS: {
  feature: string;
  values: (boolean | "partial")[];
}[] = [
  { feature: "Authentification à deux facteurs", values: [true, "partial", false] },
  { feature: "Solde centralisé (wallet)", values: [true, false, false] },
  { feature: "Recharge à la demande", values: [true, "partial", true] },
  { feature: "Paiement instantané", values: [true, "partial", true] },
  { feature: "Multi-organisation", values: [true, false, false] },
  { feature: "Traçabilité des transactions", values: [true, true, false] },
  { feature: "Intégration en un clic (popup)", values: [true, false, false] },
];

function BenchmarkCell({ value }: { value: boolean | "partial" }) {
  if (value === true) {
    return (
      <span className="yypay:inline-flex yypay:h-6 yypay:w-6 yypay:items-center yypay:justify-center yypay:rounded-full yypay:bg-success/15 yypay:text-success">
        <Check className="yypay:h-4 yypay:w-4" />
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="yypay:inline-flex yypay:h-6 yypay:w-6 yypay:items-center yypay:justify-center yypay:rounded-full yypay:bg-muted yypay:text-muted-foreground">
        <Minus className="yypay:h-4 yypay:w-4" />
      </span>
    );
  }
  return (
    <span className="yypay:text-lg yypay:font-medium yypay:text-muted-foreground/50">
      —
    </span>
  );
}

export default function LandingPage() {
  return (
    <div className="yypay:flex yypay:min-h-full yypay:flex-col yypay:bg-background">
      <SiteHeader />
      <main className="yypay:flex-1">
        <section
          id="accueil"
          className="yypay:mx-auto yypay:max-w-6xl yypay:px-4 yypay:py-16 sm:yypay:px-6 sm:yypay:py-24"
        >
          <div className="yypay:mx-auto yypay:max-w-3xl yypay:text-center">
            <h1 className="yypay:text-3xl yypay:font-bold yypay:tracking-tight yypay:text-foreground sm:yypay:text-5xl">
              Gérez vos paiements et abonnements en toute simplicité
            </h1>
            <p className="yypay:mx-auto yypay:mt-6 yypay:max-w-2xl yypay:text-base yypay:text-muted-foreground sm:yypay:text-lg">
              Un portefeuille centralisé, des paiements instantanés et une
              connexion sécurisée pour tous vos services Yowyob.
            </p>
            <div className="yypay:mt-8 yypay:flex yypay:flex-col yypay:items-center yypay:justify-center yypay:gap-3 sm:yypay:flex-row">
              <Button asChild size="lg">
                <a href={YOWAUTH_LOGIN_URL}>Se connecter</a>
              </Button>
            </div>
          </div>
        </section>

        <section
          id="comment-ca-marche"
          className="yypay:border-y yypay:border-border yypay:bg-card yypay:py-16 sm:yypay:py-20"
        >
          <div className="yypay:mx-auto yypay:max-w-6xl yypay:px-4 sm:yypay:px-6">
            <div className="yypay:mb-10 yypay:text-center">
              <h2 className="yypay:text-2xl yypay:font-bold yypay:text-foreground sm:yypay:text-3xl">
                Comment ça marche
              </h2>
              <p className="yypay:mt-2 yypay:text-muted-foreground">
                Un parcours en 4 étapes, de la connexion au paiement.
              </p>
            </div>
            <div className="yypay:grid yypay:grid-cols-1 yypay:gap-6 sm:yypay:grid-cols-2 lg:yypay:grid-cols-4">
              {STEPS.map((step) => (
                <Card
                  key={step.title}
                  className="yypay:transition-transform hover:yypay:-translate-y-0.5 hover:yypay:shadow-card-hover"
                >
                  <CardHeader>
                    <step.icon className="yypay:mb-2 yypay:h-8 yypay:w-8 yypay:text-primary" />
                    <CardTitle className="yypay:text-lg">{step.title}</CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section
          id="benchmark"
          className="yypay:py-16 sm:yypay:py-20"
        >
          <div className="yypay:mx-auto yypay:max-w-5xl yypay:px-4 sm:yypay:px-6">
            <div className="yypay:mb-10 yypay:text-center">
              <h2 className="yypay:text-2xl yypay:font-bold yypay:text-foreground sm:yypay:text-3xl">
                Pourquoi YowYob Payment
              </h2>
              <p className="yypay:mt-2 yypay:text-muted-foreground">
                Ce que le portefeuille apporte face aux moyens de paiement
                traditionnels.
              </p>
            </div>

            <div className="yypay:overflow-x-auto">
              <table className="yypay:w-full yypay:min-w-[560px] yypay:border-separate yypay:border-spacing-0 yypay:overflow-hidden yypay:rounded-xl yypay:border yypay:border-border">
                <thead>
                  <tr>
                    <th className="yypay:bg-card yypay:px-4 yypay:py-4 yypay:text-left yypay:text-sm yypay:font-semibold yypay:text-foreground">
                      Fonctionnalité
                    </th>
                    {BENCHMARK_COLUMNS.map((col, index) => (
                      <th
                        key={col}
                        className={
                          index === 0
                            ? "yypay:bg-accent yypay:px-4 yypay:py-4 yypay:text-center yypay:text-sm yypay:font-semibold yypay:text-accent-foreground"
                            : "yypay:bg-card yypay:px-4 yypay:py-4 yypay:text-center yypay:text-sm yypay:font-semibold yypay:text-muted-foreground"
                        }
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BENCHMARK_ROWS.map((row) => (
                    <tr key={row.feature}>
                      <td className="yypay:border-t yypay:border-border yypay:px-4 yypay:py-3 yypay:text-sm yypay:text-foreground">
                        {row.feature}
                      </td>
                      {row.values.map((value, index) => (
                        <td
                          key={`${row.feature}-${index}`}
                          className={
                            index === 0
                              ? "yypay:border-t yypay:border-border yypay:bg-accent/40 yypay:px-4 yypay:py-3 yypay:text-center"
                              : "yypay:border-t yypay:border-border yypay:px-4 yypay:py-3 yypay:text-center"
                          }
                        >
                          <span className="yypay:inline-flex yypay:items-center yypay:justify-center">
                            <BenchmarkCell value={value} />
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
