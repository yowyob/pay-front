"use client";

import { SiteHeader } from "@/components/layout/site-header";
import { PlansPricingSection } from "@/components/plans/plans-pricing-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCommercialPlanQuotes } from "@/hooks/use-commercial-plan-quotes";
import { useLocale } from "@/i18n/locale-provider";
import { bffGet } from "@/lib/bff-client";
import type { BillingPeriod } from "@/lib/commercial-plan-display";
import type { components } from "@/types/schemas-payment";
import {
  Building2,
  CreditCard,
  KeyRound,
  Lock,
  Search,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type CommercialPlanResponse = components["schemas"]["CommercialPlanResponse"];

const STEP_ICONS: LucideIcon[] = [Lock, Building2, CreditCard, ShoppingCart];
const FEATURE_ICONS: LucideIcon[] = [Wallet, Search, Tag, ShieldCheck];
const TRUST_ICONS: LucideIcon[] = [KeyRound, Lock, ShieldCheck];

export default function LandingPage() {
  const { t } = useLocale();
  const steps = t.landing.steps;
  const features = t.landing.features;
  const trustItems = [
    t.landing.trust.delegatedAuth,
    t.landing.trust.noPasswordStored,
    t.landing.trust.securePayments,
  ];
  const [plans, setPlans] = useState<CommercialPlanResponse[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("MONTHLY");
  const { quotes, loading: quotesLoading } = useCommercialPlanQuotes(
    plans,
    billingPeriod,
  );

  useEffect(() => {
    bffGet<CommercialPlanResponse[]>("/api/plans")
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .catch(() => setPlans([]))
      .finally(() => setLoadingPlans(false));
  }, []);

  return (
    <div className="yypay:flex yypay:min-h-full yypay:flex-col yypay:bg-background">
      <SiteHeader />
      <main className="yypay:flex-1">
        <section
          id="accueil"
          className="yypay:relative yypay:overflow-hidden yypay:px-4 yypay:py-16 sm:yypay:px-6 sm:yypay:py-24"
        >
          <div
            aria-hidden
            className="yypay:pointer-events-none yypay:absolute yypay:left-1/2 yypay:top-0 yypay:h-[32rem] yypay:w-[32rem] yypay:-translate-x-1/2 yypay:-translate-y-1/3 yypay:rounded-full yypay:bg-primary/10 yypay:blur-3xl"
          />
          <div className="yypay:relative yypay:mx-auto yypay:max-w-3xl yypay:text-center">
            <Badge className="yypay:mb-4">{t.landing.badge}</Badge>
            <h1 className="yypay:text-3xl yypay:font-bold yypay:tracking-tight yypay:text-foreground sm:yypay:text-5xl">
              {t.landing.heroTitle}
            </h1>
            <p className="yypay:mt-4 yypay:text-base yypay:text-muted-foreground sm:yypay:text-lg">
              {t.landing.heroDescription}
            </p>
            <div className="yypay:mt-8 yypay:flex yypay:flex-col yypay:items-center yypay:justify-center yypay:gap-3 sm:yypay:flex-row">
              <Button asChild size="lg">
                <Link href="/login">{t.landing.login}</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#tarifs">{t.landing.seePricing}</a>
              </Button>
            </div>

            <ul className="yypay:mt-10 yypay:flex yypay:flex-col yypay:items-center yypay:justify-center yypay:gap-3 yypay:text-sm yypay:text-muted-foreground sm:yypay:flex-row sm:yypay:gap-6">
              {trustItems.map((item, index) => {
                const Icon = TRUST_ICONS[index];
                return (
                  <li key={item} className="yypay:flex yypay:items-center yypay:gap-2">
                    <Icon className="yypay:h-4 yypay:w-4 yypay:text-primary" />
                    {item}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section
          id="comment-ca-marche"
          className="yypay:border-y yypay:border-border yypay:bg-card yypay:py-16 sm:yypay:py-20"
        >
          <div className="yypay:mx-auto yypay:max-w-6xl yypay:px-4 sm:yypay:px-6">
            <div className="yypay:mb-10 yypay:text-center">
              <h2 className="yypay:text-2xl yypay:font-bold yypay:text-foreground sm:yypay:text-3xl">
                {t.landing.howItWorksTitle}
              </h2>
              <p className="yypay:mt-2 yypay:text-muted-foreground">
                {t.landing.howItWorksDescription}
              </p>
            </div>
            <div className="yypay:grid yypay:grid-cols-1 yypay:gap-6 sm:yypay:grid-cols-2 lg:yypay:grid-cols-4">
              {steps.map((step, index) => {
                const Icon = STEP_ICONS[index];
                return (
                  <Card
                    key={step.title}
                    className="yypay:relative yypay:transition-transform hover:yypay:-translate-y-0.5 hover:yypay:shadow-card-hover"
                  >
                    <CardHeader>
                      <div className="yypay:flex yypay:items-center yypay:justify-between">
                        <span className="yypay:flex yypay:h-10 yypay:w-10 yypay:items-center yypay:justify-center yypay:rounded-lg yypay:bg-primary/10 yypay:text-primary">
                          <Icon className="yypay:h-5 yypay:w-5" />
                        </span>
                        <span className="yypay:text-sm yypay:font-semibold yypay:text-muted-foreground/60">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <CardTitle className="yypay:mt-2 yypay:text-lg">{step.title}</CardTitle>
                      <CardDescription>{step.description}</CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="documentation"
          className="yypay:mx-auto yypay:max-w-6xl yypay:px-4 yypay:py-16 sm:yypay:px-6"
        >
          <div className="yypay:mb-10 yypay:text-center">
            <h2 className="yypay:text-2xl yypay:font-bold yypay:text-foreground sm:yypay:text-3xl">
              {t.landing.featuresTitle}
            </h2>
            <p className="yypay:mt-2 yypay:text-muted-foreground">
              {t.landing.featuresDescription}
            </p>
          </div>
          <div className="yypay:grid yypay:grid-cols-1 yypay:gap-6 sm:yypay:grid-cols-2">
            {features.map((feature, index) => {
              const Icon = FEATURE_ICONS[index];
              return (
                <Card
                  key={feature.title}
                  className="yypay:transition-transform hover:yypay:-translate-y-0.5 hover:yypay:shadow-card-hover"
                >
                  <CardHeader className="yypay:flex-row yypay:items-start yypay:gap-4 yypay:space-y-0">
                    <span className="yypay:flex yypay:h-11 yypay:w-11 yypay:shrink-0 yypay:items-center yypay:justify-center yypay:rounded-xl yypay:bg-primary yypay:text-primary-foreground">
                      <Icon className="yypay:h-5 yypay:w-5" />
                    </span>
                    <div>
                      <CardTitle className="yypay:text-lg">{feature.title}</CardTitle>
                      <CardDescription className="yypay:mt-1.5">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>

        <section
          id="tarifs"
          className="yypay:border-t yypay:border-border yypay:bg-muted/30 yypay:py-16 sm:yypay:py-20"
        >
          <div className="yypay:mx-auto yypay:max-w-7xl yypay:px-4 sm:yypay:px-6">
            <PlansPricingSection
              plans={plans}
              loading={loadingPlans}
              quotes={quotes}
              quotesLoading={quotesLoading}
              billingPeriod={billingPeriod}
              onBillingPeriodChange={setBillingPeriod}
              getCtaLabel={() => t.landing.getStarted}
              onSelectPlan={() => {
                globalThis.location.assign("/login");
              }}
            />
          </div>
        </section>
      </main>

      <footer className="yypay:border-t yypay:border-border yypay:bg-card">
        <div className="yypay:mx-auto yypay:flex yypay:max-w-6xl yypay:flex-col yypay:items-center yypay:justify-between yypay:gap-4 yypay:px-4 yypay:py-8 sm:yypay:flex-row sm:yypay:px-6">
          <div className="yypay:flex yypay:items-center yypay:gap-2">
            <span className="yypay:flex yypay:h-8 yypay:w-8 yypay:items-center yypay:justify-center yypay:rounded-lg yypay:bg-primary yypay:text-primary-foreground">
              <Wallet className="yypay:h-4 yypay:w-4" />
            </span>
            <div>
              <p className="yypay:text-sm yypay:font-semibold yypay:text-foreground">
                YowYob Payment
              </p>
              <p className="yypay:text-xs yypay:text-muted-foreground">
                {t.landing.footerTagline}
              </p>
            </div>
          </div>
          <p className="yypay:text-xs yypay:text-muted-foreground">
            {t.landing.footerRights(new Date().getFullYear())}
          </p>
        </div>
      </footer>
    </div>
  );
}
