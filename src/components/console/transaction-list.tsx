"use client";

import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { toIntlTag } from "@/i18n/format";
import { useLocale } from "@/i18n/locale-provider";
import { bffGet } from "@/lib/bff-client";
import {
    formatActivityAmount,
    formatActivityDetail,
    formatActivityStatusLabel,
    formatActivityType,
    getActivityDirection,
    getActivitySignedAmount,
    getActivityStatusGroup,
    getActivityStatusVariant,
    type ActivityDirection,
    type ActivityStatusGroup,
    type PaymentActivityItem,
    type PaymentActivitySource,
} from "@/lib/payment-activity";
import { ActivityFlowChart } from "@/components/console/activity-flow-chart";
import {
    ArrowDownLeft,
    ArrowDownToLine,
    ArrowUpRight,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    Package,
    Search,
    Tag,
    Wallet,
    type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type TransactionListProps = {
  walletId?: string | null;
  walletName?: string | null;
};

type StatusFilter = "all" | ActivityStatusGroup;
type DirectionFilter = "all" | ActivityDirection;

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const SOURCE_ICONS: Record<PaymentActivitySource, LucideIcon> = {
  wallet: Wallet,
  recharge_order: ArrowDownToLine,
  payment_order: CreditCard,
  plan_order: Tag,
  bundle_order: Package,
};

function formatActivityDate(createdAt: string | undefined, intlTag: string) {
  if (!createdAt) {
    return { date: "-", time: "" };
  }
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) {
    return { date: "-", time: "" };
  }
  return {
    date: parsed.toLocaleDateString(intlTag, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: parsed.toLocaleTimeString(intlTag, {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export function TransactionList({ walletId, walletName }: TransactionListProps) {
  const { t, locale } = useLocale();
  const intlTag = toIntlTag(locale);
  const [activity, setActivity] = useState<PaymentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

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
        toast.error(error instanceof Error ? error.message : t.transactionList.loadError);
      } finally {
        setLoading(false);
      }
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletId]);

  const stats = useMemo(() => {
    const counts = { success: 0, pending: 0, failed: 0, other: 0 };
    for (const item of activity) {
      counts[getActivityStatusGroup(item.status)] += 1;
    }
    return counts;
  }, [activity]);

  /** Totaux monetaires : seules les operations reussies sont comptees. */
  const totals = useMemo(() => {
    let inbound = 0;
    let outbound = 0;
    let currency: string | undefined;
    for (const item of activity) {
      const signed = getActivitySignedAmount(item);
      if (signed === 0) continue;
      currency = currency ?? item.currency;
      if (signed > 0) {
        inbound += signed;
      } else {
        outbound += -signed;
      }
    }
    return { inbound, outbound, net: inbound - outbound, currency };
  }, [activity]);

  const formatTotal = (value: number) =>
    `${Math.round(value).toLocaleString(intlTag)}${totals.currency ? ` ${totals.currency}` : ""}`;

  const normalizedSearch = search.trim().toLowerCase();

  const filteredActivity = useMemo(() => {
    return activity.filter((item) => {
      if (
        statusFilter !== "all" &&
        getActivityStatusGroup(item.status) !== statusFilter
      ) {
        return false;
      }
      if (
        directionFilter !== "all" &&
        getActivityDirection(item) !== directionFilter
      ) {
        return false;
      }
      if (!normalizedSearch) return true;
      const haystack = [
        formatActivityType(item, t),
        item.detail,
        item.reference,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity, statusFilter, directionFilter, normalizedSearch, locale]);

  // Tout changement de filtre ramene a la premiere page.
  useEffect(() => {
    setPage(1);
  }, [statusFilter, directionFilter, normalizedSearch, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filteredActivity.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * pageSize;
  const pagedActivity = filteredActivity.slice(pageStart, pageStart + pageSize);

  const walletLabel = walletName?.trim() || t.wallet.defaultName;
  const hasFiltersApplied =
    statusFilter !== "all" ||
    directionFilter !== "all" ||
    normalizedSearch.length > 0;

  const directionTabs: { value: DirectionFilter; label: string }[] = [
    { value: "all", label: t.transactionList.directionTabs.all },
    { value: "in", label: t.transactionList.directionTabs.in },
    { value: "out", label: t.transactionList.directionTabs.out },
  ];

  const statusTabs: { value: StatusFilter; label: string }[] = [
    { value: "all", label: t.transactionList.statusTabs.all },
    { value: "success", label: t.transactionList.statusTabs.success },
    { value: "pending", label: t.transactionList.statusTabs.pending },
    { value: "failed", label: t.transactionList.statusTabs.failed },
  ];

  function resetFilters() {
    setStatusFilter("all");
    setDirectionFilter("all");
    setSearch("");
  }

  if (loading) {
    return (
      <div className="yypay:space-y-4">
        <Skeleton className="yypay:h-20 yypay:w-full" />
        <Skeleton className="yypay:h-96 yypay:w-full" />
      </div>
    );
  }

  if (!walletId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.transactionList.noWalletTitle}</CardTitle>
          <CardDescription>{t.transactionList.noWalletDescription}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="yypay:space-y-6">
      <div className="yypay:grid yypay:grid-cols-1 yypay:gap-3 sm:yypay:grid-cols-3">
        <Card>
          <CardContent className="yypay:p-4">
            <p className="yypay:flex yypay:items-center yypay:gap-1.5 yypay:text-xs yypay:font-medium yypay:text-muted-foreground">
              <ArrowDownLeft className="yypay:h-3.5 yypay:w-3.5" />
              {t.transactionList.stats.inbound}
            </p>
            <p className="yypay:mt-1 yypay:text-2xl yypay:font-bold yypay:text-emerald-600 dark:yypay:text-emerald-400">
              +{formatTotal(totals.inbound)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="yypay:p-4">
            <p className="yypay:flex yypay:items-center yypay:gap-1.5 yypay:text-xs yypay:font-medium yypay:text-muted-foreground">
              <ArrowUpRight className="yypay:h-3.5 yypay:w-3.5" />
              {t.transactionList.stats.outbound}
            </p>
            <p className="yypay:mt-1 yypay:text-2xl yypay:font-bold yypay:text-rose-600 dark:yypay:text-rose-400">
              -{formatTotal(totals.outbound)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="yypay:p-4">
            <p className="yypay:text-xs yypay:font-medium yypay:text-muted-foreground">
              {t.transactionList.stats.net}
            </p>
            <p className="yypay:mt-1 yypay:text-2xl yypay:font-bold yypay:text-foreground">
              {totals.net >= 0 ? "+" : "-"}
              {formatTotal(Math.abs(totals.net))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.transactionList.chartTitle}</CardTitle>
          <CardDescription>{t.transactionList.chartDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFlowChart
            items={filteredActivity}
            intlTag={intlTag}
            currency={totals.currency}
            labels={{
              inbound: t.transactionList.stats.inbound,
              outbound: t.transactionList.stats.outbound,
              empty: t.transactionList.chartEmpty,
            }}
          />
        </CardContent>
      </Card>

      <div className="yypay:grid yypay:grid-cols-2 yypay:gap-3 sm:yypay:grid-cols-4">
        <Card>
          <CardContent className="yypay:p-4">
            <p className="yypay:text-xs yypay:font-medium yypay:text-muted-foreground">
              {t.transactionList.stats.total}
            </p>
            <p className="yypay:mt-1 yypay:text-2xl yypay:font-bold yypay:text-foreground">
              {activity.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="yypay:p-4">
            <p className="yypay:text-xs yypay:font-medium yypay:text-muted-foreground">
              {t.transactionList.stats.success}
            </p>
            <p className="yypay:mt-1 yypay:text-2xl yypay:font-bold yypay:text-emerald-600 dark:yypay:text-emerald-400">
              {stats.success}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="yypay:p-4">
            <p className="yypay:text-xs yypay:font-medium yypay:text-muted-foreground">
              {t.transactionList.stats.pending}
            </p>
            <p className="yypay:mt-1 yypay:text-2xl yypay:font-bold yypay:text-foreground">
              {stats.pending}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="yypay:p-4">
            <p className="yypay:text-xs yypay:font-medium yypay:text-muted-foreground">
              {t.transactionList.stats.failed}
            </p>
            <p className="yypay:mt-1 yypay:text-2xl yypay:font-bold yypay:text-rose-600 dark:yypay:text-rose-400">
              {stats.failed}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="yypay:gap-4">
          <div>
            <CardTitle>{t.transactionList.historyTitle(walletLabel)}</CardTitle>
            <CardDescription>
              {t.transactionList.summary(filteredActivity.length, activity.length)}
            </CardDescription>
          </div>

          <div className="yypay:flex yypay:flex-col yypay:gap-3 sm:yypay:flex-row sm:yypay:items-center sm:yypay:justify-between">
            <Tabs
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              className="yypay:gap-0"
            >
              <TabsList className="yypay:w-full sm:yypay:w-auto">
                {statusTabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <Tabs
              value={directionFilter}
              onValueChange={(value) =>
                setDirectionFilter(value as DirectionFilter)
              }
              className="yypay:gap-0"
            >
              <TabsList className="yypay:w-full sm:yypay:w-auto">
                {directionTabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="yypay:relative sm:yypay:w-64">
              <Search className="yypay:pointer-events-none yypay:absolute yypay:left-3 yypay:top-1/2 yypay:h-4 yypay:w-4 yypay:-translate-y-1/2 yypay:text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.transactionList.searchPlaceholder}
                className="yypay:pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="yypay:text-sm yypay:text-secondary">
              {t.transactionList.emptyAll}
            </p>
          ) : filteredActivity.length === 0 ? (
            <div className="yypay:flex yypay:flex-col yypay:items-center yypay:gap-3 yypay:py-10 yypay:text-center">
              <p className="yypay:text-sm yypay:text-secondary">
                {t.transactionList.emptyFiltered}
              </p>
              {hasFiltersApplied && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="yypay:text-sm yypay:font-medium yypay:text-primary hover:yypay:underline"
                >
                  {t.transactionList.resetFilters}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="yypay:hidden yypay:overflow-x-auto md:yypay:block">
                <table className="yypay:w-full yypay:text-left yypay:text-sm">
                  <thead>
                    <tr className="yypay:border-b yypay:border-border yypay:text-secondary">
                      <th className="yypay:py-2 yypay:pr-4">{t.transactionList.table.type}</th>
                      <th className="yypay:py-2 yypay:pr-4">{t.transactionList.table.date}</th>
                      <th className="yypay:py-2 yypay:pr-4">{t.transactionList.table.direction}</th>
                      <th className="yypay:py-2 yypay:pr-4">{t.transactionList.table.amount}</th>
                      <th className="yypay:py-2 yypay:pr-4">{t.transactionList.table.status}</th>
                      <th className="yypay:py-2">{t.transactionList.table.detail}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedActivity.map((item) => {
                      const Icon = SOURCE_ICONS[item.source];
                      const { date, time } = formatActivityDate(item.createdAt, intlTag);
                      const direction = getActivityDirection(item);
                      const isInbound = direction === "in";
                      const DirectionIcon = isInbound ? ArrowDownLeft : ArrowUpRight;
                      const directionClass = isInbound
                        ? "yypay:text-emerald-600 dark:yypay:text-emerald-400"
                        : "yypay:text-rose-600 dark:yypay:text-rose-400";
                      const directionLabel = isInbound
                        ? t.transactionList.directionTabs.in
                        : t.transactionList.directionTabs.out;
                      return (
                        <tr
                          key={item.id}
                          className="yypay:border-b yypay:border-border/60 hover:yypay:bg-muted/40"
                        >
                          <td className="yypay:py-3 yypay:pr-4">
                            <div className="yypay:flex yypay:items-center yypay:gap-2 yypay:font-medium yypay:text-foreground">
                              <span className="yypay:flex yypay:h-8 yypay:w-8 yypay:shrink-0 yypay:items-center yypay:justify-center yypay:rounded-lg yypay:bg-muted yypay:text-muted-foreground">
                                <Icon className="yypay:h-4 yypay:w-4" />
                              </span>
                              {formatActivityType(item, t)}
                            </div>
                          </td>
                          <td className="yypay:py-3 yypay:pr-4 yypay:whitespace-nowrap">
                            <div>{date}</div>
                            <div className="yypay:text-xs yypay:text-secondary">{time}</div>
                          </td>
                          <td className="yypay:py-3 yypay:pr-4">
                            <span
                              className={`yypay:inline-flex yypay:items-center yypay:gap-1 yypay:text-xs yypay:font-medium ${directionClass}`}
                            >
                              <DirectionIcon className="yypay:h-3.5 yypay:w-3.5" />
                              {directionLabel}
                            </span>
                          </td>
                          <td
                            className={`yypay:py-3 yypay:pr-4 yypay:font-medium yypay:whitespace-nowrap ${directionClass}`}
                          >
                            {item.amount == null
                              ? "-"
                              : `${isInbound ? "+" : "-"}${formatActivityAmount(item, intlTag)}`}
                          </td>
                          <td className="yypay:py-3 yypay:pr-4">
                            <Badge variant={getActivityStatusVariant(item.status)}>
                              {formatActivityStatusLabel(item.status, t)}
                            </Badge>
                          </td>
                          <td className="yypay:py-3 yypay:max-w-xs yypay:truncate yypay:text-secondary">
                            {formatActivityDetail(item)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="yypay:space-y-3 md:yypay:hidden">
                {pagedActivity.map((item) => {
                  const Icon = SOURCE_ICONS[item.source];
                  const { date, time } = formatActivityDate(item.createdAt, intlTag);
                  const isInbound = getActivityDirection(item) === "in";
                  const DirectionIcon = isInbound ? ArrowDownLeft : ArrowUpRight;
                  const directionClass = isInbound
                    ? "yypay:text-emerald-600 dark:yypay:text-emerald-400"
                    : "yypay:text-rose-600 dark:yypay:text-rose-400";
                  return (
                    <div
                      key={item.id}
                      className="yypay:rounded-lg yypay:border yypay:border-border yypay:p-4"
                    >
                      <div className="yypay:flex yypay:items-start yypay:justify-between yypay:gap-3">
                        <div className="yypay:flex yypay:items-center yypay:gap-2">
                          <span className="yypay:flex yypay:h-8 yypay:w-8 yypay:shrink-0 yypay:items-center yypay:justify-center yypay:rounded-lg yypay:bg-muted yypay:text-muted-foreground">
                            <Icon className="yypay:h-4 yypay:w-4" />
                          </span>
                          <p className="yypay:font-medium yypay:text-foreground">
                            {formatActivityType(item, t)}
                          </p>
                        </div>
                        <Badge variant={getActivityStatusVariant(item.status)}>
                          {formatActivityStatusLabel(item.status, t)}
                        </Badge>
                      </div>
                      <p
                        className={`yypay:mt-3 yypay:flex yypay:items-center yypay:gap-1 yypay:text-lg yypay:font-bold ${directionClass}`}
                      >
                        <DirectionIcon className="yypay:h-4 yypay:w-4" />
                        {item.amount == null
                          ? "-"
                          : `${isInbound ? "+" : "-"}${formatActivityAmount(item, intlTag)}`}
                      </p>
                      <p className="yypay:mt-1 yypay:text-xs yypay:text-secondary">
                        {date} - {time}
                      </p>
                      <p className="yypay:mt-1 yypay:truncate yypay:text-xs yypay:text-secondary">
                        {formatActivityDetail(item)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="yypay:mt-4 yypay:flex yypay:flex-col yypay:gap-3 yypay:border-t yypay:border-border yypay:pt-4 sm:yypay:flex-row sm:yypay:items-center sm:yypay:justify-between">
                <div className="yypay:flex yypay:items-center yypay:gap-3 yypay:text-xs yypay:text-secondary">
                  <span>
                    {t.transactionList.pagination.range(
                      pageStart + 1,
                      pageStart + pagedActivity.length,
                      filteredActivity.length,
                    )}
                  </span>
                  <label className="yypay:flex yypay:items-center yypay:gap-1.5">
                    <span>{t.transactionList.pagination.perPage}</span>
                    <select
                      value={pageSize}
                      onChange={(event) => setPageSize(Number(event.target.value))}
                      className="yypay:rounded-md yypay:border yypay:border-border yypay:bg-background yypay:px-2 yypay:py-1 yypay:text-xs yypay:text-foreground"
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="yypay:flex yypay:items-center yypay:gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={currentPage <= 1}
                    className="yypay:inline-flex yypay:items-center yypay:gap-1 yypay:rounded-md yypay:border yypay:border-border yypay:px-2.5 yypay:py-1.5 yypay:text-xs yypay:font-medium yypay:text-foreground disabled:yypay:opacity-40 hover:yypay:bg-muted/60"
                  >
                    <ChevronLeft className="yypay:h-3.5 yypay:w-3.5" />
                    {t.transactionList.pagination.previous}
                  </button>
                  <span className="yypay:text-xs yypay:text-secondary">
                    {t.transactionList.pagination.page(currentPage, pageCount)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.min(pageCount, current + 1))
                    }
                    disabled={currentPage >= pageCount}
                    className="yypay:inline-flex yypay:items-center yypay:gap-1 yypay:rounded-md yypay:border yypay:border-border yypay:px-2.5 yypay:py-1.5 yypay:text-xs yypay:font-medium yypay:text-foreground disabled:yypay:opacity-40 hover:yypay:bg-muted/60"
                  >
                    {t.transactionList.pagination.next}
                    <ChevronRight className="yypay:h-3.5 yypay:w-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
