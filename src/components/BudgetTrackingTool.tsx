"use client";

import { useCallback, useEffect, useState } from "react";
import { formatBidMicros } from "@/lib/format";

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
  if (percent === null) return { label: "No budget set", className: "text-gray-500 bg-gray-100" };
  if (percent > 110) return { label: "Over pacing", className: "text-red-600 bg-red-50" };
  if (percent < 85) return { label: "Under pacing", className: "text-amber-600 bg-amber-50" };
  return { label: "On pace", className: "text-emerald-600 bg-emerald-50" };
}

function barColor(percent: number | null): string {
  if (percent === null) return "bg-gray-300";
  if (percent > 110) return "bg-red-500";
  if (percent < 85) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function BudgetTrackingTool() {
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const grandTotals = blendedCurrency
    ? sumTotals(okAccounts.flatMap((a) => a.campaigns))
    : null;
  const grandPacing = grandTotals ? mtdPacingPercent(grandTotals) : null;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">
            {accounts.length > 0
              ? `${accounts.length} account${accounts.length === 1 ? "" : "s"} in your MCC`
              : "Budget tracking"}
          </p>
          {data && (
            <p className="text-xs text-black/50 dark:text-white/50">
              Day {data.dayOfMonth} of {data.daysInMonth} this month · updated{" "}
              {new Date(data.asOf).toLocaleTimeString()}
            </p>
          )}
        </div>
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

      {grandTotals && blendedCurrency && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Daily budget" value={formatBidMicros(grandTotals.dailyBudgetMicros, blendedCurrency)} />
          <StatCard
            label="Spent today"
            value={formatBidMicros(grandTotals.todaySpendMicros, blendedCurrency)}
            sub={
              grandTotals.dailyBudgetMicros > 0
                ? `${Math.round((grandTotals.todaySpendMicros / grandTotals.dailyBudgetMicros) * 100)}% of daily budget`
                : undefined
            }
          />
          <StatCard
            label="Spent month-to-date"
            value={formatBidMicros(grandTotals.mtdSpendMicros, blendedCurrency)}
            sub={grandPacing !== null ? `${Math.round(grandPacing)}% of pace` : undefined}
          />
          <StatCard
            label="Projected month total"
            value={formatBidMicros(grandTotals.projectedMonthSpendMicros, blendedCurrency)}
            sub={
              grandTotals.monthlyBudgetTargetMicros > 0
                ? `vs ${formatBidMicros(grandTotals.monthlyBudgetTargetMicros, blendedCurrency)} budget`
                : undefined
            }
          />
        </div>
      )}
      {okAccounts.length > 1 && !blendedCurrency && (
        <p className="text-xs text-black/50 dark:text-white/50">
          Accounts use different currencies, so totals are shown per account below rather than blended.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {loading && !data && (
          <p className="text-sm text-black/50 dark:text-white/50">Loading account budgets…</p>
        )}
        {data && accounts.length === 0 && (
          <p className="text-sm text-black/50 dark:text-white/50">
            No enabled client accounts found under this MCC.
          </p>
        )}
        {accounts.map((account) => (
          <AccountSection key={account.id} account={account} />
        ))}
      </div>
    </div>
  );
}

function AccountSection({ account }: { account: AccountBudget }) {
  const totals = sumTotals(account.campaigns);
  const currency = account.currencyCode;
  const pacing = mtdPacingPercent(totals);
  const status = pacingStatus(pacing);

  return (
    <details className="group rounded-xl border border-black/10 dark:border-white/15 open:pb-4">
      <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-black/30 dark:text-white/30 transition-transform group-open:rotate-90">▸</span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{account.name ?? `Account ${account.id}`}</p>
            <p className="text-xs text-black/50 dark:text-white/50">
              {account.id} · {account.campaigns.length} campaign{account.campaigns.length === 1 ? "" : "s"} ·{" "}
              {currency}
            </p>
          </div>
        </div>
        {account.error ? (
          <span className="inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-red-600 bg-red-50">
            Failed to load
          </span>
        ) : (
          <span className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
        )}
      </summary>

      <div className="flex flex-col gap-3 px-4">
        {account.error && <p className="text-sm text-red-600">{account.error}</p>}

        {!account.error && account.campaigns.length === 0 && (
          <p className="text-sm text-black/50 dark:text-white/50">
            No active or paused campaigns on this account.
          </p>
        )}

        {!account.error && account.campaigns.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Daily budget" value={formatBidMicros(totals.dailyBudgetMicros, currency)} />
              <StatCard label="Spent today" value={formatBidMicros(totals.todaySpendMicros, currency)} />
              <StatCard label="Spent MTD" value={formatBidMicros(totals.mtdSpendMicros, currency)} />
              <StatCard
                label="Projected month total"
                value={formatBidMicros(totals.projectedMonthSpendMicros, currency)}
              />
            </div>

            <div className="flex flex-col gap-3">
              {account.campaigns.map((c) => (
                <CampaignCard key={c.id} campaign={c} currency={currency} />
              ))}
            </div>
          </>
        )}
      </div>
    </details>
  );
}

function CampaignCard({ campaign: c, currency }: { campaign: CampaignBudget; currency: string }) {
  const mtdStatus = pacingStatus(c.mtdPacingPercent);
  return (
    <div className="rounded-lg border border-black/10 dark:border-white/15 p-3 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">{c.name}</p>
          <p className="text-xs text-black/50 dark:text-white/50">
            {STATUS_LABELS[c.status] ?? c.status} · {formatBidMicros(c.dailyBudgetMicros, currency)}/day
            {c.budgetPeriod !== "DAILY" ? ` (${c.budgetPeriod.toLowerCase()} budget)` : ""}
          </p>
        </div>
        <span
          className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${mtdStatus.className}`}
        >
          {mtdStatus.label}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PacingBar
          label="Today"
          spendMicros={c.todaySpendMicros}
          targetMicros={c.dailyBudgetMicros}
          percent={c.todayPacingPercent}
          currency={currency}
        />
        <PacingBar
          label="Month-to-date"
          spendMicros={c.mtdSpendMicros}
          targetMicros={c.expectedMtdBudgetMicros}
          percent={c.mtdPacingPercent}
          currency={currency}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/15 p-4 flex flex-col gap-1">
      <span className="text-xs text-black/50 dark:text-white/50">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
      {sub && <span className="text-xs text-black/50 dark:text-white/50">{sub}</span>}
    </div>
  );
}

function PacingBar({
  label,
  spendMicros,
  targetMicros,
  percent,
  currency,
}: {
  label: string;
  spendMicros: number;
  targetMicros: number;
  percent: number | null;
  currency: string;
}) {
  const width = percent === null ? 0 : Math.min(100, Math.max(0, percent));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-black/60 dark:text-white/60">{label}</span>
        <span className="font-medium">
          {formatBidMicros(spendMicros, currency)}
          {targetMicros > 0 ? ` / ${formatBidMicros(targetMicros, currency)}` : ""}
        </span>
      </div>
      <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor(percent)}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
