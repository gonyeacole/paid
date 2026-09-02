"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { formatBidMicros } from "@/lib/format";
import { IconWallet, IconTarget, IconCalendar, IconTrendingUp } from "@/components/dashboard/icons";

type CampaignBudget = {
  id: string;
  name: string;
  status: string;
  budgetPeriod: string;
  dailyBudgetMicros: number;
  todaySpendMicros: number;
  mtdSpendMicros: number;
  mtdClicks: number;
  mtdConversions: number;
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
  mtdClicks: number;
  mtdConversions: number;
  expectedMtdBudgetMicros: number;
  monthlyBudgetTargetMicros: number;
  projectedMonthSpendMicros: number;
};

type AccountRow = {
  id: string;
  name: string;
  currencyCode: string;
  campaigns: CampaignBudget[];
  totals: Totals;
  pacingPercent: number | null;
  consumptionPercent: number | null;
  costPerClickMicros: number | null;
  conversionRatePercent: number | null;
  costPerConversionMicros: number | null;
};

type PacingSortKey = "name" | "consumptionPercent" | "pacingPercent";
type AnalyticsSortKey =
  | "name"
  | "costPerClickMicros"
  | "mtdSpendMicros"
  | "conversionRatePercent"
  | "mtdConversions"
  | "costPerConversionMicros";

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
      acc.mtdClicks += c.mtdClicks;
      acc.mtdConversions += c.mtdConversions;
      acc.expectedMtdBudgetMicros += c.expectedMtdBudgetMicros;
      acc.projectedMonthSpendMicros += c.projectedMonthSpendMicros;
      acc.monthlyBudgetTargetMicros += c.monthlyBudgetTargetMicros;
      return acc;
    },
    {
      dailyBudgetMicros: 0,
      todaySpendMicros: 0,
      mtdSpendMicros: 0,
      mtdClicks: 0,
      mtdConversions: 0,
      expectedMtdBudgetMicros: 0,
      projectedMonthSpendMicros: 0,
      monthlyBudgetTargetMicros: 0,
    }
  );
}

function formatConversions(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function formatPercent(value: number | null, decimals = 2): string {
  return value === null ? "—" : `${value.toFixed(decimals)}%`;
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

function pacingTextColor(percent: number | null): string {
  if (percent === null) return "text-(--text-muted)";
  if (percent > 110) return "text-(--status-critical)";
  if (percent < 85) return "text-(--status-warning)";
  return "text-(--status-good)";
}

type BudgetSubTabId = "pacing" | "analytics";

export default function BudgetTrackingTool({ activeSubTab }: { activeSubTab: BudgetSubTabId }) {
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pacingSort, setPacingSort] = useState<{ key: PacingSortKey; dir: "asc" | "desc" }>({
    key: "name",
    dir: "asc",
  });
  const [analyticsSort, setAnalyticsSort] = useState<{ key: AnalyticsSortKey; dir: "asc" | "desc" }>({
    key: "name",
    dir: "asc",
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  const accountRows: AccountRow[] = useMemo(
    () =>
      (data?.accounts ?? [])
        .filter((a) => !a.error)
        .map((a) => {
          const totals = sumTotals(a.campaigns);
          const pacingPercent = mtdPacingPercent(totals);
          const consumptionPercent =
            totals.monthlyBudgetTargetMicros > 0
              ? (totals.mtdSpendMicros / totals.monthlyBudgetTargetMicros) * 100
              : null;
          const costPerClickMicros = totals.mtdClicks > 0 ? totals.mtdSpendMicros / totals.mtdClicks : null;
          const conversionRatePercent =
            totals.mtdClicks > 0 ? (totals.mtdConversions / totals.mtdClicks) * 100 : null;
          const costPerConversionMicros =
            totals.mtdConversions > 0 ? totals.mtdSpendMicros / totals.mtdConversions : null;
          return {
            id: a.id,
            name: a.name ?? `Account ${a.id}`,
            currencyCode: a.currencyCode,
            campaigns: a.campaigns,
            totals,
            pacingPercent,
            consumptionPercent,
            costPerClickMicros,
            conversionRatePercent,
            costPerConversionMicros,
          };
        }),
    [data]
  );

  function sortRows<K extends string>(rows: AccountRow[], sort: { key: K; dir: "asc" | "desc" }): AccountRow[] {
    const sorted = [...rows];
    const { key, dir } = sort;
    sorted.sort((a, b) => {
      const av = a[key as keyof AccountRow];
      const bv = b[key as keyof AccountRow];
      let cmp: number;
      if (typeof av === "string" || typeof bv === "string") {
        cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      } else {
        const an = (av as number | null) ?? -Infinity;
        const bn = (bv as number | null) ?? -Infinity;
        cmp = an === bn ? 0 : an < bn ? -1 : 1;
      }
      return dir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }

  const sortedAccountRows = useMemo(() => sortRows(accountRows, pacingSort), [accountRows, pacingSort]);
  const sortedAnalyticsRows = useMemo(() => sortRows(accountRows, analyticsSort), [accountRows, analyticsSort]);

  function togglePacingSort(key: PacingSortKey) {
    setPacingSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }
    );
  }

  function toggleAnalyticsSort(key: AnalyticsSortKey) {
    setAnalyticsSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }
    );
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
          Accounts use different currencies, so the stat cards above only cover a single-currency subset
          when one exists — per-account figures in the tables below are still exact.
        </p>
      )}

      {activeSubTab === "pacing" && (
        <>
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

          <div className="rounded-xl border border-black/10 dark:border-white/15 bg-(--surface-1) overflow-hidden">
            {loading && !data && <p className="text-sm text-(--text-muted) px-5 py-4">Loading account budgets…</p>}
            {data && accountRows.length === 0 && (
              <p className="text-sm text-(--text-muted) px-5 py-4">No accounts with active or paused campaigns found.</p>
            )}
            {accountRows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/10 dark:border-white/10 text-left text-xs text-(--text-muted)">
                      <SortableHeader label="Ad accounts" sortKey="name" sort={pacingSort} onClick={togglePacingSort} />
                      <th className="px-4 py-2.5 font-medium text-right">Budget target</th>
                      <SortableHeader
                        label="Total budget"
                        sortKey="consumptionPercent"
                        sort={pacingSort}
                        onClick={togglePacingSort}
                      />
                      <th className="px-4 py-2.5 font-medium text-right">Spend</th>
                      <SortableHeader
                        label="Pacing"
                        sortKey="pacingPercent"
                        sort={pacingSort}
                        onClick={togglePacingSort}
                        align="right"
                      />
                    </tr>
                  </thead>
                  <tbody className="[font-variant-numeric:tabular-nums]">
                    {sortedAccountRows.map((a) => (
                      <AccountRowGroup
                        key={a.id}
                        account={a}
                        isExpanded={expanded.has(a.id)}
                        onToggle={() => toggleExpanded(a.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeSubTab === "analytics" && (
        <div className="rounded-xl border border-black/10 dark:border-white/15 bg-(--surface-1) overflow-hidden">
          {loading && !data && <p className="text-sm text-(--text-muted) px-5 py-4">Loading analytics…</p>}
          {data && sortedAnalyticsRows.length === 0 && (
            <p className="text-sm text-(--text-muted) px-5 py-4">No accounts with active or paused campaigns found.</p>
          )}
          {sortedAnalyticsRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10 dark:border-white/10 text-left text-xs text-(--text-muted)">
                    <SortableHeader label="Client" sortKey="name" sort={analyticsSort} onClick={toggleAnalyticsSort} />
                    <SortableHeader
                      label="Cost per click"
                      sortKey="costPerClickMicros"
                      sort={analyticsSort}
                      onClick={toggleAnalyticsSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Spend"
                      sortKey="mtdSpendMicros"
                      sort={analyticsSort}
                      onClick={toggleAnalyticsSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Conversion rate"
                      sortKey="conversionRatePercent"
                      sort={analyticsSort}
                      onClick={toggleAnalyticsSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Conversions"
                      sortKey="mtdConversions"
                      sort={analyticsSort}
                      onClick={toggleAnalyticsSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Cost per conversion"
                      sortKey="costPerConversionMicros"
                      sort={analyticsSort}
                      onClick={toggleAnalyticsSort}
                      align="right"
                    />
                  </tr>
                </thead>
                <tbody className="[font-variant-numeric:tabular-nums]">
                  {sortedAnalyticsRows.map((a) => (
                    <tr key={a.id} className="border-b border-black/5 dark:border-white/10 last:border-0">
                      <td className="px-4 py-3 font-medium max-w-[220px] truncate">{a.name}</td>
                      <td className="px-4 py-3 text-right">
                        {formatBidMicros(a.costPerClickMicros, a.currencyCode)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatBidMicros(a.totals.mtdSpendMicros, a.currencyCode)}
                      </td>
                      <td className="px-4 py-3 text-right">{formatPercent(a.conversionRatePercent)}</td>
                      <td className="px-4 py-3 text-right">{formatConversions(a.totals.mtdConversions)}</td>
                      <td className="px-4 py-3 text-right">
                        {formatBidMicros(a.costPerConversionMicros, a.currencyCode)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AccountRowGroup({
  account,
  isExpanded,
  onToggle,
}: {
  account: AccountRow;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-black/5 dark:border-white/10 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
      >
        <td className="px-4 py-3 font-medium">
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block text-(--text-muted) transition-transform"
              style={{ transform: isExpanded ? "rotate(90deg)" : "none" }}
            >
              ▸
            </span>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 px-1.5 text-xs font-normal text-(--text-secondary)">
              {account.campaigns.length}
            </span>
            {account.name}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          {formatBidMicros(account.totals.monthlyBudgetTargetMicros, account.currencyCode)}
        </td>
        <td className="px-4 py-3">
          <BudgetProgressCell
            percent={account.consumptionPercent}
            amount={account.totals.monthlyBudgetTargetMicros}
            currency={account.currencyCode}
            colorPercent={account.pacingPercent}
          />
        </td>
        <td className="px-4 py-3 text-right">{formatBidMicros(account.totals.mtdSpendMicros, account.currencyCode)}</td>
        <td className={`px-4 py-3 text-right font-medium ${pacingTextColor(account.pacingPercent)}`}>
          {account.pacingPercent !== null ? `${Math.round(account.pacingPercent)}%` : "—"}
        </td>
      </tr>
      {isExpanded &&
        account.campaigns.map((c) => {
          const campaignConsumption =
            c.monthlyBudgetTargetMicros > 0 ? (c.mtdSpendMicros / c.monthlyBudgetTargetMicros) * 100 : null;
          return (
            <tr key={c.id} className="border-b border-black/5 dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.02]">
              <td className="pl-11 pr-4 py-2.5 text-(--text-secondary)">
                {c.name}
                {c.status !== "ENABLED" && (
                  <span className="ml-1.5 text-xs text-(--text-muted)">({STATUS_LABELS[c.status] ?? c.status})</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right text-(--text-secondary)">
                {formatBidMicros(c.monthlyBudgetTargetMicros, account.currencyCode)}
              </td>
              <td className="px-4 py-2.5">
                <BudgetProgressCell
                  percent={campaignConsumption}
                  amount={c.monthlyBudgetTargetMicros}
                  currency={account.currencyCode}
                  colorPercent={c.mtdPacingPercent}
                  muted
                />
              </td>
              <td className="px-4 py-2.5 text-right text-(--text-secondary)">
                {formatBidMicros(c.mtdSpendMicros, account.currencyCode)}
              </td>
              <td className={`px-4 py-2.5 text-right ${pacingTextColor(c.mtdPacingPercent)}`}>
                {c.mtdPacingPercent !== null ? `${Math.round(c.mtdPacingPercent)}%` : "—"}
              </td>
            </tr>
          );
        })}
    </>
  );
}

function BudgetProgressCell({
  percent,
  amount,
  currency,
  colorPercent,
  muted,
}: {
  percent: number | null;
  amount: number;
  currency: string;
  colorPercent: number | null;
  muted?: boolean;
}) {
  const barColor =
    colorPercent === null
      ? "bg-gray-300"
      : colorPercent > 110
        ? "bg-(--status-critical)"
        : colorPercent < 85
          ? "bg-(--status-warning)"
          : "bg-(--status-good)";
  const width = percent === null ? 0 : Math.min(100, Math.max(0, percent));
  return (
    <div className="flex items-center gap-2.5 min-w-[180px]">
      <span className={`w-9 shrink-0 text-xs font-medium ${pacingTextColor(colorPercent)}`}>
        {percent !== null ? `${Math.round(percent)}%` : "—"}
      </span>
      <div className="h-1.5 flex-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${width}%` }} />
      </div>
      <span className={`shrink-0 text-xs ${muted ? "text-(--text-muted)" : "text-(--text-secondary)"}`}>
        {formatBidMicros(amount, currency)}
      </span>
    </div>
  );
}

function SortableHeader<K extends string>({
  label,
  sortKey,
  sort,
  onClick,
  align,
}: {
  label: string;
  sortKey: K;
  sort: { key: K; dir: "asc" | "desc" };
  onClick: (key: K) => void;
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
