"use client";

import { SiteHeader } from "@/components/layout/site-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { YOWAUTH_LOGIN_URL } from "@/lib/external-auth";
import { Building2, CreditCard, Lock, ShoppingCart } from "lucide-react";

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
      </main>
    </div>
  );
}
