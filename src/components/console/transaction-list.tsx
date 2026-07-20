"use client";

import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { bffGet } from "@/lib/bff-client";
import {
    formatActivityAmount,
    formatActivityType,
    getActivityStatusVariant,
    type PaymentActivityItem,
} from "@/lib/payment-activity";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type TransactionListProps = {
  walletId?: string | null;
  walletName?: string | null;
};

export function TransactionList({ walletId, walletName }: TransactionListProps) {
  const [activity, setActivity] = useState<PaymentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!walletId) {
        setActivity([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await bffGet<PaymentActivityItem[]>(
          `/api/payments/activity?walletId=${walletId}&limit=100`,
        );
        setActivity(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de charger l'historique",
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [walletId]);

  const walletLabel = walletName?.trim() || "Mon wallet";

  if (loading) {
    return <Skeleton className="yypay:h-64 yypay:w-full" />;
  }

  if (!walletId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
          <CardDescription>Créez un wallet pour voir l&apos;historique.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique - {walletLabel}</CardTitle>
        <CardDescription>
          {activity.length} opération(s) - wallet, recharges, paiements, plans et
          bundles (tous statuts).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="yypay:text-sm yypay:text-secondary">
            Aucune opération pour le moment.
          </p>
        ) : (
          <>
            <div className="yypay:hidden yypay:overflow-x-auto md:yypay:block">
              <table className="yypay:w-full yypay:text-left yypay:text-sm">
                <thead>
                  <tr className="yypay:border-b yypay:border-border yypay:text-secondary">
                    <th className="yypay:py-2 yypay:pr-4">Date</th>
                    <th className="yypay:py-2 yypay:pr-4">Type</th>
                    <th className="yypay:py-2 yypay:pr-4">Montant</th>
                    <th className="yypay:py-2 yypay:pr-4">Statut</th>
                    <th className="yypay:py-2">Détail</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.map((item) => (
                    <tr
                      key={item.id}
                      className="yypay:border-b yypay:border-border/60"
                    >
                      <td className="yypay:py-3 yypay:pr-4">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString("fr-FR")
                          : "-"}
                      </td>
                      <td className="yypay:py-3 yypay:pr-4 yypay:font-medium yypay:text-foreground">
                        {formatActivityType(item)}
                      </td>
                      <td className="yypay:py-3 yypay:pr-4">
                        {formatActivityAmount(item)}
                      </td>
                      <td className="yypay:py-3 yypay:pr-4">
                        <Badge variant={getActivityStatusVariant(item.status)}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="yypay:py-3 yypay:text-secondary">
                        {item.detail ?? item.reference ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="yypay:space-y-3 md:yypay:hidden">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="yypay:rounded-lg yypay:border yypay:border-border yypay:p-4"
                >
                  <div className="yypay:flex yypay:items-center yypay:justify-between yypay:gap-3">
                    <p className="yypay:font-medium yypay:text-foreground">
                      {formatActivityType(item)}
                    </p>
                    <Badge variant={getActivityStatusVariant(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="yypay:mt-3 yypay:text-lg yypay:font-bold">
                    {formatActivityAmount(item)}
                  </p>
                  <p className="yypay:mt-1 yypay:text-xs yypay:text-secondary">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString("fr-FR")
                      : "-"}
                  </p>
                  <p className="yypay:mt-1 yypay:text-xs yypay:text-secondary">
                    {item.detail ?? item.reference ?? "-"}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
