"use client";

import { useConsoleData } from "@/components/console/console-data-provider";
import { TransactionList } from "@/components/console/transaction-list";
import { useLocale } from "@/i18n/locale-provider";

export default function TransactionsPage() {
  const { wallet } = useConsoleData();
  const { t } = useLocale();

  return (
    <>
      <div className="yypay:mb-8">
        <h1 className="yypay:text-2xl yypay:font-bold yypay:text-foreground sm:yypay:text-3xl">
          {t.pages.transactions.title}
        </h1>
        <p className="yypay:mt-2 yypay:text-muted-foreground">
          {t.pages.transactions.description}
        </p>
      </div>
      <TransactionList walletId={wallet?.id} walletName={wallet?.ownerName} />
    </>
  );
}
