import { NextResponse } from "next/server";
import { getGoogleAdsChildCustomer, getGoogleAdsMccCustomer } from "@/lib/googleAds";

export const dynamic = "force-dynamic";

const ACCOUNT_CONCURRENCY = 5;

type ClientAccountRow = {
  customer_client?: {
    id?: string | number | null;
    descriptive_name?: string | null;
    currency_code?: string | null;
    manager?: boolean | null;
    status?: string | null;
  };
};

type CampaignQueryRow = {
  campaign?: { id?: string | number | null; name?: string | null; status?: string | null };
  campaign_budget?: { amount_micros?: string | number | null; period?: string | null };
};

type TodayMetricsQueryRow = {
  campaign?: { id?: string | number | null };
  metrics?: { cost_micros?: string | number | null };
};

type MtdMetricsQueryRow = {
  campaign?: { id?: string | number | null };
  metrics?: {
    cost_micros?: string | number | null;
    clicks?: string | number | null;
    conversions?: string | number | null;
  };
};

function toMicros(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : 0;
}

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : 0;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function fetchAccountBudget(customerId: string, dayOfMonth: number, daysInMonth: number) {
  const customer = getGoogleAdsChildCustomer(customerId);

  const [campaignRows, todayRows, mtdRows] = await Promise.all([
    customer.query<CampaignQueryRow[]>(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign_budget.amount_micros,
        campaign_budget.period
      FROM campaign
      WHERE campaign.status IN ('ENABLED', 'PAUSED')
      ORDER BY campaign.name
    `),
    customer.query<TodayMetricsQueryRow[]>(`
      SELECT campaign.id, metrics.cost_micros
      FROM campaign
      WHERE segments.date DURING TODAY
    `),
    customer.query<MtdMetricsQueryRow[]>(`
      SELECT campaign.id, metrics.cost_micros, metrics.clicks, metrics.conversions
      FROM campaign
      WHERE segments.date DURING THIS_MONTH
    `),
  ]);

  const todaySpendByCampaign = new Map<string, number>();
  for (const row of todayRows) {
    const id = row.campaign?.id;
    if (id == null) continue;
    const key = String(id);
    todaySpendByCampaign.set(
      key,
      (todaySpendByCampaign.get(key) ?? 0) + toMicros(row.metrics?.cost_micros)
    );
  }

  const mtdSpendByCampaign = new Map<string, number>();
  const mtdClicksByCampaign = new Map<string, number>();
  const mtdConversionsByCampaign = new Map<string, number>();
  for (const row of mtdRows) {
    const id = row.campaign?.id;
    if (id == null) continue;
    const key = String(id);
    mtdSpendByCampaign.set(
      key,
      (mtdSpendByCampaign.get(key) ?? 0) + toMicros(row.metrics?.cost_micros)
    );
    mtdClicksByCampaign.set(key, (mtdClicksByCampaign.get(key) ?? 0) + toNumber(row.metrics?.clicks));
    mtdConversionsByCampaign.set(
      key,
      (mtdConversionsByCampaign.get(key) ?? 0) + toNumber(row.metrics?.conversions)
    );
  }

  const campaigns = campaignRows
    .filter((row) => row.campaign?.id != null)
    .map((row) => {
      const id = String(row.campaign!.id);
      const dailyBudgetMicros = toMicros(row.campaign_budget?.amount_micros);
      const todaySpendMicros = todaySpendByCampaign.get(id) ?? 0;
      const mtdSpendMicros = mtdSpendByCampaign.get(id) ?? 0;
      const mtdClicks = mtdClicksByCampaign.get(id) ?? 0;
      const mtdConversions = mtdConversionsByCampaign.get(id) ?? 0;
      const expectedMtdBudgetMicros = dailyBudgetMicros * dayOfMonth;
      const monthlyBudgetTargetMicros = dailyBudgetMicros * daysInMonth;
      const projectedMonthSpendMicros =
        dayOfMonth > 0 ? Math.round((mtdSpendMicros / dayOfMonth) * daysInMonth) : 0;

      return {
        id,
        name: row.campaign?.name ?? "(unnamed campaign)",
        status: row.campaign?.status ?? "UNKNOWN",
        budgetPeriod: row.campaign_budget?.period ?? "DAILY",
        dailyBudgetMicros,
        todaySpendMicros,
        mtdSpendMicros,
        mtdClicks,
        mtdConversions,
        expectedMtdBudgetMicros,
        monthlyBudgetTargetMicros,
        projectedMonthSpendMicros,
        todayPacingPercent:
          dailyBudgetMicros > 0 ? (todaySpendMicros / dailyBudgetMicros) * 100 : null,
        mtdPacingPercent:
          expectedMtdBudgetMicros > 0 ? (mtdSpendMicros / expectedMtdBudgetMicros) * 100 : null,
      };
    });

  return { campaigns };
}

export async function GET() {
  try {
    const mccCustomer = getGoogleAdsMccCustomer();

    const clientRows = await mccCustomer.query<ClientAccountRow[]>(`
      SELECT
        customer_client.id,
        customer_client.descriptive_name,
        customer_client.currency_code,
        customer_client.manager,
        customer_client.status
      FROM customer_client
      WHERE customer_client.status = 'ENABLED'
    `);

    const childAccounts = clientRows
      .filter((row) => row.customer_client?.manager === false && row.customer_client?.id != null)
      .map((row) => ({
        id: String(row.customer_client!.id),
        name: row.customer_client?.descriptive_name ?? null,
        currencyCode: row.customer_client?.currency_code ?? "USD",
      }));

    const now = new Date();
    const dayOfMonth = now.getUTCDate();
    const daysInMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)
    ).getUTCDate();

    const accounts = await mapWithConcurrency(childAccounts, ACCOUNT_CONCURRENCY, async (account) => {
      try {
        const { campaigns } = await fetchAccountBudget(account.id, dayOfMonth, daysInMonth);
        return { ...account, campaigns, error: null as string | null };
      } catch (error) {
        console.error(`Google Ads budget tracking request failed for account ${account.id}`, error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return { ...account, campaigns: [], error: message };
      }
    });

    return NextResponse.json({
      asOf: now.toISOString(),
      dayOfMonth,
      daysInMonth,
      accounts,
    });
  } catch (error) {
    console.error("Google Ads MCC budget tracking request failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Google Ads API request failed: ${message}` },
      { status: 502 }
    );
  }
}
