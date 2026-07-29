"use client";

import { WalletCard } from "@/components/console/wallet-card";
import { useLocale } from "@/i18n/locale-provider";

export default function ConsoleOverviewPage() {
  const { t } = useLocale();

  return (
    <>
      <div className="yypay:mb-8">
        <h1 className="yypay:text-2xl yypay:font-bold yypay:text-foreground sm:yypay:text-3xl">
          {t.pages.overview.title}
        </h1>
        <p className="yypay:mt-2 yypay:text-muted-foreground">
          {t.pages.overview.description}
        </p>
      </div>
      <div className="yypay:max-w-xl">
        <WalletCard />
      </div>
    </>
  );
}
