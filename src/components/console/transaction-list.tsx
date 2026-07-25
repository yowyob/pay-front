"use client";

import { ActivityFlowChart } from "@/components/console/activity-flow-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    formatActivityType,
    getActivityDirection,
    getActivityStatusGroup,
    isSettledActivity,
    sortActivityItems,
    type ActivityDirection,
    type ActivityStatusGroup,
    type PaymentActivityItem,
} from "@/lib/payment-activity";
import { ArrowDownLeft, ArrowUpRight, Minus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type TransactionListProps = {
  walletId?: string | null;
  walletName?: string | null;
};

type DirectionFilter = "all" | "in" | "out";
type StatusFilter = "all" | ActivityStatusGroup;

const PAGE_SIZE = 8;

const DIRECTION_FILTERS: { value: DirectionFilter; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "in", label: "Entrées" },
  { value: "out", label: "Sorties" },
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tous statuts" },
  { value: "success", label: "Réussies" },
  { value: "pending", label: "En attente" },
  { value: "failed", label: "Échouées" },
];

function directionMeta(direction: ActivityDirection) {
  switch (direction) {
    case "in":
      return { Icon: ArrowDownLeft, sign: "+", color: "#10b981", label: "Entrée" };
    case "out":
      return { Icon: ArrowUpRight, sign: "-", color: "#ef4444", label: "Sortie" };
    default:
      return { Icon: Minus, sign: "", color: "var(--color-secondary)", label: "-" };
  }
}

function statusVariant(
  group: ActivityStatusGroup,
): "success" | "secondary" | "default" {
  if (group === "success") return "success";
  if (group === "pending") return "secondary";
  return "default";
}

function SignedAmount({ item }: { item: PaymentActivityItem }) {
  const direction = getActivityDirection(item);
  const { sign, color } = directionMeta(direction);
  if (item.amount == null) return <span className="yypay:text-secondary">-</span>;
  const formatted = item.amount.toLocaleString("fr-FR");
  return (
    <span className="yypay:font-semibold" style={{ color }}>
      {sign}
      {formatted}
      {item.currency ? ` ${item.currency}` : ""}
    </span>
  );
}

function SummaryTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="yypay:rounded-lg yypay:border yypay:border-border yypay:p-4">
      <p className="yypay:text-xs yypay:text-secondary">{label}</p>
      <p
        className="yypay:mt-1 yypay:text-xl yypay:font-bold yypay:text-foreground"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

export function TransactionList({ walletId, walletName }: TransactionListProps) {
  const [activity, setActivity] = useState<PaymentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState<DirectionFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

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
        setActivity(sortActivityItems(Array.isArray(data) ? data : []));
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

  // Les filtres/pagination changent → on revient à la première page.
  useEffect(() => {
    setPage(1);
  }, [direction, status]);

  const currency = useMemo(
    () => activity.find((item) => item.currency)?.currency ?? "XAF",
    [activity],
  );

  const totals = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    for (const item of activity) {
      if (!isSettledActivity(item) || item.amount == null) continue;
      const dir = getActivityDirection(item);
      if (dir === "in") totalIn += item.amount;
      else if (dir === "out") totalOut += item.amount;
    }
    return { totalIn, totalOut, net: totalIn - totalOut };
  }, [activity]);

  const filtered = useMemo(() => {
    return activity.filter((item) => {
      if (direction !== "all" && getActivityDirection(item) !== direction) {
        return false;
      }
      if (status !== "all" && getActivityStatusGroup(item.status) !== status) {
        return false;
      }
      return true;
    });
  }, [activity, direction, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const walletLabel = walletName?.trim() || "Mon wallet";

  if (loading) {
    return <Skeleton className="yypay:h-96 yypay:w-full" />;
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

  const fmt = (value: number) =>
    `${value.toLocaleString("fr-FR")} ${currency}`;

  return (
    <div className="yypay:space-y-6">
      {/* Résumé entrées / sorties / solde net */}
      <div className="yypay:grid yypay:grid-cols-2 yypay:gap-3 lg:yypay:grid-cols-4">
        <SummaryTile label="Entrées" value={fmt(totals.totalIn)} color="#10b981" />
        <SummaryTile label="Sorties" value={fmt(totals.totalOut)} color="#ef4444" />
        <SummaryTile
          label="Solde net"
          value={fmt(totals.net)}
          color={totals.net < 0 ? "#ef4444" : undefined}
        />
        <SummaryTile label="Opérations" value={String(activity.length)} />
      </div>

      {/* Courbe entrées vs sorties */}
      <Card>
        <CardHeader>
          <CardTitle>Flux entrées / sorties</CardTitle>
          <CardDescription>
            Montants réussis par jour — {walletLabel}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFlowChart items={activity} currency={currency} />
        </CardContent>
      </Card>

      {/* Historique détaillé filtrable + paginé */}
      <Card>
        <CardHeader>
          <CardTitle>Historique - {walletLabel}</CardTitle>
          <CardDescription>
            {filtered.length} opération(s) — wallet, recharges, paiements, plans et
            bundles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="yypay:mb-4 yypay:flex yypay:flex-wrap yypay:gap-2">
            <div className="yypay:flex yypay:flex-wrap yypay:gap-1">
              {DIRECTION_FILTERS.map((f) => (
                <Button
                  key={f.value}
                  size="sm"
                  variant={direction === f.value ? "default" : "outline"}
                  onClick={() => setDirection(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
            <div className="yypay:flex yypay:flex-wrap yypay:gap-1">
              {STATUS_FILTERS.map((f) => (
                <Button
                  key={f.value}
                  size="sm"
                  variant={status === f.value ? "default" : "outline"}
                  onClick={() => setStatus(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="yypay:py-6 yypay:text-sm yypay:text-secondary">
              Aucune opération pour ces filtres.
            </p>
          ) : (
            <>
              {/* Desktop */}
              <div className="yypay:hidden yypay:overflow-x-auto md:yypay:block">
                <table className="yypay:w-full yypay:text-left yypay:text-sm">
                  <thead>
                    <tr className="yypay:border-b yypay:border-border yypay:text-secondary">
                      <th className="yypay:py-2 yypay:pr-4">Date</th>
                      <th className="yypay:py-2 yypay:pr-4">Sens</th>
                      <th className="yypay:py-2 yypay:pr-4">Type</th>
                      <th className="yypay:py-2 yypay:pr-4">Montant</th>
                      <th className="yypay:py-2 yypay:pr-4">Statut</th>
                      <th className="yypay:py-2">Détail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((item) => {
                      const dir = getActivityDirection(item);
                      const meta = directionMeta(dir);
                      const group = getActivityStatusGroup(item.status);
                      return (
                        <tr
                          key={item.id}
                          className="yypay:border-b yypay:border-border/60"
                        >
                          <td className="yypay:py-3 yypay:pr-4">
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleString("fr-FR")
                              : "-"}
                          </td>
                          <td className="yypay:py-3 yypay:pr-4">
                            <span
                              className="yypay:inline-flex yypay:items-center yypay:gap-1 yypay:text-xs yypay:font-medium"
                              style={{ color: meta.color }}
                            >
                              <meta.Icon className="yypay:h-3.5 yypay:w-3.5" />
                              {meta.label}
                            </span>
                          </td>
                          <td className="yypay:py-3 yypay:pr-4 yypay:font-medium yypay:text-foreground">
                            {formatActivityType(item)}
                          </td>
                          <td className="yypay:py-3 yypay:pr-4">
                            <SignedAmount item={item} />
                          </td>
                          <td className="yypay:py-3 yypay:pr-4">
                            <Badge variant={statusVariant(group)}>
                              {item.status}
                            </Badge>
                          </td>
                          <td className="yypay:py-3 yypay:text-secondary">
                            {item.detail ?? item.reference ?? "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="yypay:space-y-3 md:yypay:hidden">
                {paginated.map((item) => {
                  const dir = getActivityDirection(item);
                  const meta = directionMeta(dir);
                  const group = getActivityStatusGroup(item.status);
                  return (
                    <div
                      key={item.id}
                      className="yypay:rounded-lg yypay:border yypay:border-border yypay:p-4"
                    >
                      <div className="yypay:flex yypay:items-center yypay:justify-between yypay:gap-3">
                        <span
                          className="yypay:inline-flex yypay:items-center yypay:gap-1 yypay:text-xs yypay:font-medium"
                          style={{ color: meta.color }}
                        >
                          <meta.Icon className="yypay:h-3.5 yypay:w-3.5" />
                          {meta.label}
                        </span>
                        <Badge variant={statusVariant(group)}>{item.status}</Badge>
                      </div>
                      <p className="yypay:mt-2 yypay:font-medium yypay:text-foreground">
                        {formatActivityType(item)}
                      </p>
                      <p className="yypay:mt-1 yypay:text-lg">
                        <SignedAmount item={item} />
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
                  );
                })}
              </div>

              {/* Pagination */}
              {pageCount > 1 && (
                <div className="yypay:mt-4 yypay:flex yypay:items-center yypay:justify-between">
                  <p className="yypay:text-xs yypay:text-secondary">
                    Page {currentPage} / {pageCount}
                  </p>
                  <div className="yypay:flex yypay:gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Précédent
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage >= pageCount}
                      onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
