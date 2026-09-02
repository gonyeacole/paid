# Ads Keyword Estimator

A Google Ads Keyword Planner-style app with the same two tools as Keyword Planner itself,
both backed live by the real Google Ads API (`KeywordPlanIdeaService`):

- **Discover new keywords** — enter seed keywords or a landing page URL and get keyword
  ideas with average monthly search volume, competition level, and top-of-page bid estimates.
- **Get search volume and forecasts** — enter keywords you already have to get their exact
  historical search volume/competition, plus a campaign forecast (clicks, cost, conversions,
  avg. CPC/CPA) for a given bid, budget, and date range.
- **Paid Dashboards** — two sub-tabs backed by every account in your MCC:
  - *Budget Pacing* — stat cards for daily budget, today's spend, month-to-date spend, and
    projected month-end spend (blended across accounts when they share a currency), plus a
    sortable, expandable table of every account (and, expanded, its campaigns) showing budget
    target, budget consumed so far, spend, and pacing.
  - *Analytics* — a sortable per-client table: cost per click, spend, conversion rate,
    conversions, and cost per conversion, month-to-date.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Get Google Ads API credentials

You need five values, all from Google:

1. **Developer token** — Generate one under your Google Ads manager account:
   Tools & Settings → Setup → API Center. New tokens start in **test account** access;
   apply for **basic access** to query live/non-test accounts.
2. **OAuth client ID & secret** — Create an OAuth 2.0 Client ID (type: "Desktop app") in
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials) on a project
   with the Google Ads API enabled.
3. **Refresh token** — Run the OAuth consent flow once for the Google account that has
   access to your Ads account, using the client ID/secret above and the
   `https://www.googleapis.com/auth/adwords` scope. The
   [Google Ads API quickstart](https://developers.google.com/google-ads/api/docs/oauth/cloud-console)
   or the `google-ads-api` package's `GoogleAdsApi.listAccessibleCustomers` helper can walk
   you through this — the result is a long-lived refresh token.
4. **Customer ID** — The 10-digit Google Ads account ID to query, no dashes.
5. **Login customer ID** — required if `Customer ID` is a client account under a manager/MCC
   account (the manager's 10-digit ID). Also required for Paid Dashboards, where it must be
   your **MCC's own** 10-digit ID (not a sub-account) — that's the account the tool queries
   to list every account underneath it.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the values from step 2.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

- `src/lib/googleAds.ts` builds an authenticated Google Ads API client from env vars using
  the [`google-ads-api`](https://www.npmjs.com/package/google-ads-api) package.
- `src/app/api/keyword-ideas/route.ts` is a server-side route handler that calls
  `KeywordPlanIdeaService.GenerateKeywordIdeas` with your seed keywords/URL, target
  location(s), and language, and normalizes the response. Credentials never reach the
  browser.
- `src/components/KeywordIdeasTool.tsx` is the client UI: a form plus a sortable results
  table (keyword, avg. monthly searches, competition, low/high top-of-page bid).
- `src/app/api/search-volume-forecast/route.ts` calls
  `KeywordPlanIdeaService.GenerateKeywordHistoricalMetrics` (exact-keyword search volume) and
  `GenerateKeywordForecastMetrics` (projected clicks/cost/conversions for a hypothetical
  campaign — match type, max CPC bid, optional daily budget, and date range) in parallel.
- `src/components/SearchVolumeForecastTool.tsx` is the client UI for that: keyword/targeting
  inputs, bid + date range controls, forecast stat cards, and a per-keyword search volume
  table.
- `src/app/api/budget-tracking/route.ts` first queries `customer_client` on your MCC
  (`GOOGLE_ADS_LOGIN_CUSTOMER_ID`) to list every enabled, non-manager account underneath it —
  this resource returns the full hierarchy in one call, including grandchild accounts under
  sub-MCCs. For each account (5 at a time, to stay within rate limits) it then runs three GAQL
  queries against `campaign`: current budget, today's cost, and month-to-date cost/clicks/
  conversions. It computes an expected-to-date budget (daily budget × days elapsed this month)
  and a projected month-end spend (month-to-date spend annualized to the full month) per
  campaign. A failure on one account is captured per-account rather than failing the whole
  request.
- `src/components/BudgetTrackingTool.tsx` is the client UI, split into two sub-tabs: Budget
  Pacing (blended MCC-wide stat cards plus a sortable, expandable table — one row per account,
  expanding to its campaigns — with a budget-consumed progress bar and a pacing percentage) and
  Analytics (a sortable table of cost per click, spend, conversion rate, conversions, and cost
  per conversion, one row per account).
- `src/components/dashboard/DashboardShell.tsx` is the sidebar + header shell all three tools
  render inside, replacing the old horizontal tab bar.
- `src/lib/constants.ts` has a curated shortlist of common Google Ads
  [geo target constants](https://developers.google.com/google-ads/api/data/geotargets) and
  language constants for the location/language selectors. Add more IDs from that reference
  as needed.

## Notes

- Estimates reflect Google's actual historical/forecast data for the account's currency and
  the selected location/language — the same figures Keyword Planner shows for that account.
- The Google Ads API has rate limits and quota tied to your developer token's access level;
  heavy use may need Standard access.
- The forecast tool applies one match type (Broad/Phrase/Exact) to all keywords in a request,
  a simplification of Keyword Planner's per-keyword match type control.
- Google Ads API forecast periods must be in the future and are capped at a limited window
  (currently up to 90 days); an out-of-range date range returns an API error.
- Paid Dashboards treats "today" and "this month" using the server's UTC clock, which may be
  off by a few hours from each account's own timezone near midnight. Campaigns that share a
  budget with another campaign will each show that budget's full amount rather than a
  per-campaign split.
- Paid Dashboards queries every enabled client account under the MCC with no filtering or
  pagination — a large MCC means a large number of API calls on every refresh (3 per account,
  plus 1 for the account list), which can be slow and adds up against your developer token's
  quota.
- The Budget Pacing stat cards only render when every account shares a currency (a blended
  total across currencies wouldn't mean anything); both tables always show exact per-row
  figures regardless.
- Conversion rate and cost per conversion are `null`/`—` for a client with zero clicks or zero
  conversions this month, rather than showing a divide-by-zero artifact.
