import { NextResponse } from "next/server";
import { getGoogleAdsCustomer } from "@/lib/googleAds";

export const dynamic = "force-dynamic";

type CampaignQueryRow = {
  campaign?: { id?: string | number | null; name?: string | null; status?: string | null };
  campaign_budget?: { amount_micros?: string | number | null; period?: string | null };
};

type MetricsQueryRow = {
  campaign?: { id?: string | number | null };
  metrics?: { cost_micros?: string | number | null };
};

type AccountQueryRow = {
  customer?: { descriptive_name?: string | null; currency_code?: string | null };
};

function toMicros(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : 0;
}

export async function GET() {
  try {
    const customer = getGoogleAdsCustomer();

    const [campaignRows, todayRows, mtdRows, accountRows] = await Promise.all([
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
      customer.query<MetricsQueryRow[]>(`
        SELECT campaign.id, metrics.cost_micros
        FROM campaign
        WHERE segments.date DURING TODAY
      `),
      customer.query<MetricsQueryRow[]>(`
        SELECT campaign.id, metrics.cost_micros
        FROM campaign
        WHERE segments.date DURING THIS_MONTH
      `),
      customer.query<AccountQueryRow[]>(`
        SELECT customer.descriptive_name, customer.currency_code
        FROM customer
        LIMIT 1
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
    for (const row of mtdRows) {
      const id = row.campaign?.id;
      if (id == null) continue;
      const key = String(id);
      mtdSpendByCampaign.set(
        key,
        (mtdSpendByCampaign.get(key) ?? 0) + toMicros(row.metrics?.cost_micros)
      );
    }

    const now = new Date();
    const dayOfMonth = now.getUTCDate();
    const daysInMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)
    ).getUTCDate();

    const campaigns = campaignRows
      .filter((row) => row.campaign?.id != null)
      .map((row) => {
        const id = String(row.campaign!.id);
        const dailyBudgetMicros = toMicros(row.campaign_budget?.amount_micros);
        const todaySpendMicros = todaySpendByCampaign.get(id) ?? 0;
        const mtdSpendMicros = mtdSpendByCampaign.get(id) ?? 0;
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
          expectedMtdBudgetMicros,
          monthlyBudgetTargetMicros,
          projectedMonthSpendMicros,
          todayPacingPercent:
            dailyBudgetMicros > 0 ? (todaySpendMicros / dailyBudgetMicros) * 100 : null,
          mtdPacingPercent:
            expectedMtdBudgetMicros > 0 ? (mtdSpendMicros / expectedMtdBudgetMicros) * 100 : null,
        };
      });

    const account = accountRows[0];

    return NextResponse.json({
      account: {
        name: account?.customer?.descriptive_name ?? null,
        currencyCode: account?.customer?.currency_code ?? "USD",
      },
      asOf: now.toISOString(),
      dayOfMonth,
      daysInMonth,
      campaigns,
    });
  } catch (error) {
    console.error("Google Ads budget tracking request failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Google Ads API request failed: ${message}` },
      { status: 502 }
    );
  }
}
