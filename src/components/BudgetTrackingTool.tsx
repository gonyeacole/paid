"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { formatBidMicros } from "@/lib/format";
import SpendPacingChart, { type SpendPacingPoint } from "@/components/dashboard/SpendPacingChart";
import { IconWallet, IconTarget, IconCalendar, IconTrendingUp } from "@/components/dashboard/icons";

type CampaignBudget = {
  id: string;
  name: string;
  status: string;
  budgetPeriod: string;
  dailyBudgetMicros: number;
  todaySpendMicros: number;
  mtdSpendMicros: number;
  expectedMtdBudgetMicros: number;
  monthlyBudgetTargetMicros: number;
  projectedMonthSpendMicros: number;
  todayPacingPercent: number | null;
  mtdPacingPercent: number | null;
};

type AccountBudget = {
  id: string;
  name: string | null;
  currencyCode: string;
  campaigns: CampaignBudget[];
  dailySpend: { day: number; spendMicros: number }[];
  error: string | null;
};

type BudgetData = {
  asOf: string;
  dayOfMonth: number;
  daysInMonth: number;
  accounts: AccountBudget[];
};

type Totals = {
  dailyBudgetMicros: number;
  todaySpendMicros: number;
  mtdSpendMicros: number;
  expectedMtdBudgetMicros: number;
  monthlyBudgetTargetMicros: number;
  projectedMonthSpendMicros: number;
};

type CampaignRow = CampaignBudget & { accountId: string; accountName: string };

type SortKey = "name" | "accountName" | "dailyBudgetMicros" | "todaySpendMicros" | "mtdSpendMicros" | "mtdPacingPercent";

const STATUS_LABELS: Record<string, string> = {
  ENABLED: "Active",
  PAUSED: "Paused",
};

function sumTotals(campaigns: CampaignBudget[]): Totals {
  return campaigns.reduce(
    (acc, c) => {
      acc.dailyBudgetMicros += c.dailyBudgetMicros;
      acc.todaySpendMicros += c.todaySpendMicros;
      acc.mtdSpendMicros += c.mtdSpendMicros;
      acc.expectedMtdBudgetMicros += c.expectedMtdBudgetMicros;
      acc.projectedMonthSpendMicros += c.projectedMonthSpendMicros;
      acc.monthlyBudgetTargetMicros += c.monthlyBudgetTargetMicros;
      return acc;
    },
    {
      dailyBudgetMicros: 0,
      todaySpendMicros: 0,
      mtdSpendMicros: 0,
      expectedMtdBudgetMicros: 0,
      projectedMonthSpendMicros: 0,
      monthlyBudgetTargetMicros: 0,
    }
  );
}

function mtdPacingPercent(totals: Totals): number | null {
  return totals.expectedMtdBudgetMicros > 0
    ? (totals.mtdSpendMicros / totals.expectedMtdBudgetMicros) * 100
    : null;
}

function pacingStatus(percent: number | null): { label: string; className: string } {
  if (percent === null) return { label: "No budget set", className: "text-gray-500 bg-gray-100 dark:bg-white/10" };
  if (percent > 110) return { label: "Over pacing", className: "text-(--status-critical) bg-(--status-critical)/10" };
  if (percent < 85) return { label: "Under pacing", className: "text-(--status-warning) bg-(--status-warning)/15" };
  return { label: "On pace", className: "text-(--status-good) bg-(--status-good)/10" };
}

export default function BudgetTrackingTool() {
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "dailyBudgetMicros",
    dir: "desc",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/budget-tracking");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Request failed.");
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount, not derived state — the documented effect use case the rule can't tell apart.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const accounts = data?.accounts ?? [];
  const okAccounts = accounts.filter((a) => !a.error);
  const currencies = new Set(okAccounts.map((a) => a.currencyCode));
  const blendedCurrency = currencies.size === 1 ? [...currencies][0] : null;
  const blendedAccounts = blendedCurrency ? okAccounts : [];
  const grandTotals = blendedCurrency ? sumTotals(blendedAccounts.flatMap((a) => a.campaigns)) : null;
  const grandPacing = grandTotals ? mtdPacingPercent(grandTotals) : null;
  const grandStatus = pacingStatus(grandPacing);

  const chartPoints: SpendPacingPoint[] = useMemo(() => {
    if (!data || !grandTotals || blendedAccounts.length === 0) return [];
    const dailyActualByDay = new Map<number, number>();
    for (const account of blendedAccounts) {
      for (const { day, spendMicros } of account.dailySpend) {
        dailyActualByDay.set(day, (dailyActualByDay.get(day) ?? 0) + spendMicros);
      }
    }
    const monthName = new Date(data.asOf).toLocaleString("en-US", { month: "short" });
    let cumulativeActual = 0;
    const points: SpendPacingPoint[] = [];
    for (let day = 1; day <= data.daysInMonth; day++) {
      if (day <= data.dayOfMonth) {
        cumulativeActual += dailyActualByDay.get(day) ?? 0;
      }
      points.push({
        day,
        label: `${monthName} ${day}`,
        actualCumulativeMicros: day <= data.dayOfMonth ? cumulativeActual : null,
        budgetCumulativeMicros: grandTotals.dailyBudgetMicros * day,
      });
    }
    return points;
    // blendedAccounts is derived fresh each render from okAccounts/blendedCurrency; data + grandTotals cover its inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, grandTotals]);

  const campaignRows: CampaignRow[] = useMemo(
    () =>
      (data?.accounts ?? [])
        .filter((a) => !a.error)
        .flatMap((a) =>
          a.campaigns.map((c) => ({ ...c, accountId: a.id, accountName: a.name ?? `Account ${a.id}` }))
        ),
    [data]
  );

  const sortedRows = useMemo(() => {
    const rows = [...campaignRows];
    const { key, dir } = sort;
    rows.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      let cmp: number;
      if (typeof av === "string" || typeof bv === "string") {
        cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      } else {
        cmp = (av ?? -Infinity) === (bv ?? -Infinity) ? 0 : (av ?? -Infinity) < (bv ?? -Infinity) ? -1 : 1;
      }
      return dir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [campaignRows, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  const currencyForColumn = blendedCurrency ?? "USD";
  const showAccountColumn = accounts.length > 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-(--text-muted)">
          {accounts.length > 0
            ? `${accounts.length} account${accounts.length === 1 ? "" : "s"} in your MCC`
            : loading
              ? "Loading accounts…"
              : "No accounts found"}
          {data && ` · Day ${data.dayOfMonth} of ${data.daysInMonth} this month · updated ${new Date(data.asOf).toLocaleTimeString()}`}
        </p>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-md border border-black/15 dark:border-white/20 px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 transition-colors"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {accounts.some((a) => a.error) && (
        <p className="text-xs text-(--status-serious)">
          {accounts.filter((a) => a.error).length} account{accounts.filter((a) => a.error).length === 1 ? "" : "s"} failed
          to load and {accounts.filter((a) => a.error).length === 1 ? "is" : "are"} excluded from the totals below.
        </p>
      )}
      {okAccounts.length > 1 && !blendedCurrency && (
        <p className="text-xs text-(--text-muted)">
          Accounts use different currencies, so the totals and chart below only cover a single-currency
          subset when one exists — otherwise per-campaign figures in the table are still exact.
        </p>
      )}

      {grandTotals && blendedCurrency && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={IconWallet}
            label="Daily budget"
            value={formatBidMicros(grandTotals.dailyBudgetMicros, blendedCurrency)}
          />
          <StatCard
            icon={IconTarget}
            label="Spent today"
            value={formatBidMicros(grandTotals.todaySpendMicros, blendedCurrency)}
            pill={
              grandTotals.dailyBudgetMicros > 0
                ? `${Math.round((grandTotals.todaySpendMicros / grandTotals.dailyBudgetMicros) * 100)}% of daily budget`
                : undefined
            }
          />
          <StatCard
            icon={IconCalendar}
            label="Spent month-to-date"
            value={formatBidMicros(grandTotals.mtdSpendMicros, blendedCurrency)}
            pill={grandPacing !== null ? `${Math.round(grandPacing)}% of pace` : undefined}
            pillClassName={grandStatus.className}
          />
          <StatCard
            icon={IconTrendingUp}
            label="Projected month total"
            value={formatBidMicros(grandTotals.projectedMonthSpendMicros, blendedCurrency)}
            pill={
              grandTotals.monthlyBudgetTargetMicros > 0
                ? `vs ${formatBidMicros(grandTotals.monthlyBudgetTargetMicros, blendedCurrency)} budget`
                : undefined
            }
          />
        </div>
      )}

      {chartPoints.length > 1 && (
        <div className="rounded-xl border border-black/10 dark:border-white/15 bg-(--surface-1) p-5">
          <p className="text-sm font-medium mb-1">Analytics</p>
          <p className="text-xs text-(--text-muted) mb-4">Cumulative spend this month vs. an even budget pace</p>
          <SpendPacingChart points={chartPoints} currency={blendedCurrency ?? "USD"} />
        </div>
      )}

      <div className="rounded-xl border border-black/10 dark:border-white/15 bg-(--surface-1) overflow-hidden">
        <p className="text-sm font-medium px-5 pt-4 pb-3">Campaigns</p>
        {loading && !data && <p className="text-sm text-(--text-muted) px-5 pb-4">Loading campaign budgets…</p>}
        {data && campaignRows.length === 0 && (
          <p className="text-sm text-(--text-muted) px-5 pb-4">No active or paused campaigns found.</p>
        )}
        {campaignRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-black/10 dark:border-white/10 text-left text-xs text-(--text-muted)">
                  <SortableHeader label="Campaign" sortKey="name" sort={sort} onClick={toggleSort} />
                  {showAccountColumn && <SortableHeader label="Account" sortKey="accountName" sort={sort} onClick={toggleSort} />}
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <SortableHeader label="Daily budget" sortKey="dailyBudgetMicros" sort={sort} onClick={toggleSort} align="right" />
                  <SortableHeader label="Spent today" sortKey="todaySpendMicros" sort={sort} onClick={toggleSort} align="right" />
                  <SortableHeader label="Spent MTD" sortKey="mtdSpendMicros" sort={sort} onClick={toggleSort} align="right" />
                  <SortableHeader label="Pacing" sortKey="mtdPacingPercent" sort={sort} onClick={toggleSort} />
                </tr>
              </thead>
              <tbody className="[font-variant-numeric:tabular-nums]">
                {sortedRows.map((c) => {
                  const status = pacingStatus(c.mtdPacingPercent);
                  const currency = blendedCurrency ?? currencyForColumn;
                  return (
                    <tr key={`${c.accountId}-${c.id}`} className="border-b border-black/5 dark:border-white/10 last:border-0">
                      <td className="px-4 py-2.5 font-medium max-w-[220px] truncate">{c.name}</td>
                      {showAccountColumn && (
                        <td className="px-4 py-2.5 text-(--text-secondary) max-w-[160px] truncate">{c.accountName}</td>
                      )}
                      <td className="px-4 py-2.5 text-(--text-secondary)">{STATUS_LABELS[c.status] ?? c.status}</td>
                      <td className="px-4 py-2.5 text-right">{formatBidMicros(c.dailyBudgetMicros, currency)}</td>
                      <td className="px-4 py-2.5 text-right">{formatBidMicros(c.todaySpendMicros, currency)}</td>
                      <td className="px-4 py-2.5 text-right">{formatBidMicros(c.mtdSpendMicros, currency)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onClick,
  align,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onClick: (key: SortKey) => void;
  align?: "right";
}) {
  const isActive = sort.key === sortKey;
  return (
    <th className={`px-4 py-2.5 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-(--text-primary) transition-colors ${
          align === "right" ? "flex-row-reverse" : ""
        } ${isActive ? "text-(--text-primary)" : ""}`}
      >
        {label}
        <span className="text-[10px]">{isActive ? (sort.dir === "asc" ? "▲" : "▼") : ""}</span>
      </button>
    </th>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  pill,
  pillClassName,
}: {
  icon: (props: { className?: string }) => ReactElement;
  label: string;
  value: string;
  pill?: string;
  pillClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/15 bg-(--surface-1) p-4 flex flex-col gap-2.5">
      <div className="flex items-center gap-2 text-(--text-muted)">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xl font-semibold">{value}</span>
      {pill && (
        <span
          className={`self-start rounded-full px-2 py-0.5 text-[11px] font-medium ${
            pillClassName ?? "text-(--text-secondary) bg-black/5 dark:bg-white/10"
          }`}
        >
          {pill}
        </span>
      )}
    </div>
  );
}
