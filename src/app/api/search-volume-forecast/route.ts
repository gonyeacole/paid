import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getGoogleAdsCustomer,
  KEYWORD_PLAN_NETWORK,
  KEYWORD_MATCH_TYPE,
} from "@/lib/googleAds";

export const dynamic = "force-dynamic";

const requestSchema = z
  .object({
    keywords: z.array(z.string().trim().min(1)).min(1).max(20),
    locationIds: z.array(z.string().trim().min(1)).min(1),
    languageId: z.string().trim().min(1),
    includeAdultKeywords: z.boolean().default(false),
    matchType: z.enum(["BROAD", "PHRASE", "EXACT"]).default("BROAD"),
    maxCpcMicros: z.number().int().positive(),
    dailyBudgetMicros: z.number().int().positive().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    currencyCode: z.string().trim().length(3).optional(),
  })
  .refine((data) => data.startDate < data.endDate, {
    message: "Forecast start date must be before the end date.",
  });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join(" ") },
      { status: 400 }
    );
  }

  const {
    keywords,
    locationIds,
    languageId,
    includeAdultKeywords,
    matchType,
    maxCpcMicros,
    dailyBudgetMicros,
    startDate,
    endDate,
    currencyCode,
  } = parsed.data;

  try {
    const customer = getGoogleAdsCustomer();
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;
    const geoTargetConstants = locationIds.map((id) => `geoTargetConstants/${id}`);
    const language = `languageConstants/${languageId}`;

    const [historicalResponse, forecastResponse] = await Promise.all([
      customer.keywordPlanIdeas.generateKeywordHistoricalMetrics({
        customer_id: customerId,
        keywords,
        language,
        geo_target_constants: geoTargetConstants,
        keyword_plan_network: KEYWORD_PLAN_NETWORK.GOOGLE_SEARCH,
        include_adult_keywords: includeAdultKeywords,
      } as never),
      customer.keywordPlanIdeas.generateKeywordForecastMetrics({
        customer_id: customerId,
        currency_code: currencyCode,
        forecast_period: { start_date: startDate, end_date: endDate },
        campaign: {
          language_constants: [language],
          geo_target_constants: geoTargetConstants,
          bidding_strategy: {
            manual_cpc_bidding_strategy: {
              max_cpc_bid_micros: maxCpcMicros,
              daily_budget_micros: dailyBudgetMicros,
            },
          },
          ad_groups: [
            {
              keywords: keywords.map((text) => ({
                text,
                match_type: KEYWORD_MATCH_TYPE[matchType],
              })),
            },
          ],
        },
      } as never),
    ]);

    const searchVolume = (historicalResponse.results ?? []).map((result) => {
      const metrics = result.keyword_metrics;
      return {
        text: result.text ?? "",
        avgMonthlySearches: metrics?.avg_monthly_searches ?? 0,
        competition: metrics?.competition ?? "UNSPECIFIED",
        competitionIndex: metrics?.competition_index ?? null,
        lowTopOfPageBidMicros: metrics?.low_top_of_page_bid_micros ?? null,
        highTopOfPageBidMicros: metrics?.high_top_of_page_bid_micros ?? null,
        monthlySearchVolumes: (metrics?.monthly_search_volumes ?? []).map((v) => ({
          year: v.year ?? null,
          month: v.month ?? null,
          searches: v.monthly_searches ?? 0,
        })),
      };
    });

    const forecastMetrics = forecastResponse.campaign_forecast_metrics;
    const forecast = {
      clicks: forecastMetrics?.clicks ?? 0,
      costMicros: forecastMetrics?.cost_micros ?? 0,
      averageCpcMicros: forecastMetrics?.average_cpc_micros ?? null,
      conversions: forecastMetrics?.conversions ?? 0,
      averageCpaMicros: forecastMetrics?.average_cpa_micros ?? null,
    };

    return NextResponse.json({ searchVolume, forecast });
  } catch (error) {
    console.error("Google Ads search volume/forecast request failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Google Ads API request failed: ${message}` },
      { status: 502 }
    );
  }
}
