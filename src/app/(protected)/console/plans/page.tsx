"use client";

import { useConsoleData } from "@/components/console/console-data-provider";
import { PlansGrid } from "@/components/console/plans-grid";
import { useLocale } from "@/i18n/locale-provider";

export default function PlansPage() {
  const { refreshKey } = useConsoleData();
  const { t } = useLocale();

  return (
    <>
      <div className="yypay:mb-8">
        <h1 className="yypay:text-2xl yypay:font-bold yypay:text-foreground sm:yypay:text-3xl">
          {t.pages.plans.title}
        </h1>
        <p className="yypay:mt-2 yypay:text-muted-foreground">
          {t.pages.plans.description}
        </p>
      </div>
      <PlansGrid refreshKey={refreshKey} />
    </>
  );
}
