import { NextResponse } from "next/server";
import { z } from "zod";
import { getGoogleAdsCustomer, KEYWORD_PLAN_NETWORK } from "@/lib/googleAds";

export const dynamic = "force-dynamic";

const requestSchema = z
  .object({
    keywords: z.array(z.string().trim().min(1)).max(20).default([]),
    url: z.string().trim().url().optional().or(z.literal("")),
    locationIds: z.array(z.string().trim().min(1)).min(1),
    languageId: z.string().trim().min(1),
    includeAdultKeywords: z.boolean().default(false),
  })
  .refine((data) => data.keywords.length > 0 || !!data.url, {
    message: "Provide at least one keyword or a URL.",
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

  const { keywords, url, locationIds, languageId, includeAdultKeywords } = parsed.data;

  const seed =
    keywords.length > 0 && url
      ? { keyword_and_url_seed: { keywords, url } }
      : url
        ? { url_seed: { url } }
        : { keyword_seed: { keywords } };

  try {
    const customer = getGoogleAdsCustomer();

    const results = await customer.keywordPlanIdeas.generateKeywordIdeas({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
      language: `languageConstants/${languageId}`,
      geo_target_constants: locationIds.map((id) => `geoTargetConstants/${id}`),
      keyword_plan_network: KEYWORD_PLAN_NETWORK.GOOGLE_SEARCH,
      include_adult_keywords: includeAdultKeywords,
      ...seed,
    } as never);

    const ideas = (results.results ?? []).map((result) => {
      const metrics = result.keyword_idea_metrics;
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

    return NextResponse.json({ ideas });
  } catch (error) {
    console.error("Google Ads keyword idea request failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Google Ads API request failed: ${message}` },
      { status: 502 }
    );
  }
}
