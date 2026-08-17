"use client";

import { useMemo, useState } from "react";
import { LOCATIONS, LANGUAGES, COMPETITION_LABELS } from "@/lib/constants";
import { formatSearches, formatBidMicros } from "@/lib/format";

type SearchVolumeResult = {
  text: string;
  avgMonthlySearches: number;
  competition: string;
  competitionIndex: number | null;
  lowTopOfPageBidMicros: number | null;
  highTopOfPageBidMicros: number | null;
};

type Forecast = {
  clicks: number;
  costMicros: number;
  averageCpcMicros: number | null;
  conversions: number;
  averageCpaMicros: number | null;
};

function defaultDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

export default function SearchVolumeForecastTool() {
  const [keywordsInput, setKeywordsInput] = useState("");
  const [locationId, setLocationId] = useState<string>(LOCATIONS[0].id);
  const [languageId, setLanguageId] = useState<string>(LANGUAGES[0].id);
  const [includeAdultKeywords, setIncludeAdultKeywords] = useState(false);
  const [matchType, setMatchType] = useState<"BROAD" | "PHRASE" | "EXACT">("BROAD");
  const [maxCpc, setMaxCpc] = useState("1.00");
  const [dailyBudget, setDailyBudget] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [startDate, setStartDate] = useState(defaultDate(1));
  const [endDate, setEndDate] = useState(defaultDate(31));

  const [searchVolume, setSearchVolume] = useState<SearchVolumeResult[] | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keywords = useMemo(
    () =>
      keywordsInput
        .split(/[\n,]/)
        .map((k) => k.trim())
        .filter(Boolean),
    [keywordsInput]
  );

  const maxCpcMicros = useMemo(() => {
    const value = Number(maxCpc);
    return Number.isFinite(value) && value > 0 ? Math.round(value * 1_000_000) : null;
  }, [maxCpc]);

  const dailyBudgetMicros = useMemo(() => {
    const value = Number(dailyBudget);
    return Number.isFinite(value) && value > 0 ? Math.round(value * 1_000_000) : undefined;
  }, [dailyBudget]);

  const canSubmit = keywords.length > 0 && !!maxCpcMicros && !!startDate && !!endDate;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!maxCpcMicros) {
      setError("Enter a valid max CPC bid.");
      return;
    }
    setLoading(true);
    setError(null);
    setSearchVolume(null);
    setForecast(null);

    try {
      const res = await fetch("/api/search-volume-forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords,
          locationIds: [locationId],
          languageId,
          includeAdultKeywords,
          matchType,
          maxCpcMicros,
          dailyBudgetMicros,
          startDate,
          endDate,
          currencyCode: currencyCode.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Request failed.");
      }
      setSearchVolume(data.searchVolume);
      setForecast(data.forecast);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-xl border border-black/10 dark:border-white/15 p-6"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sv-keywords" className="text-sm font-medium">
            Keywords
          </label>
          <textarea
            id="sv-keywords"
            placeholder={"running shoes\nmarathon training\nbest hiking boots"}
            value={keywordsInput}
            onChange={(e) => setKeywordsInput(e.target.value)}
            rows={3}
            className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-black/50 dark:text-white/50">
            The exact keywords you want search volume + a forecast for. One per line or
            comma-separated, up to 20.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sv-location" className="text-sm font-medium">
              Location
            </label>
            <select
              id="sv-location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="sv-language" className="text-sm font-medium">
              Language
            </label>
            <select
              id="sv-language"
              value={languageId}
              onChange={(e) => setLanguageId(e.target.value)}
              className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sv-match-type" className="text-sm font-medium">
              Match type (forecast)
            </label>
            <select
              id="sv-match-type"
              value={matchType}
              onChange={(e) => setMatchType(e.target.value as "BROAD" | "PHRASE" | "EXACT")}
              className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="BROAD">Broad</option>
              <option value="PHRASE">Phrase</option>
              <option value="EXACT">Exact</option>
            </select>
            <p className="text-xs text-black/50 dark:text-white/50">Applied to all keywords.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="sv-max-cpc" className="text-sm font-medium">
              Max CPC bid
            </label>
            <input
              id="sv-max-cpc"
              type="number"
              min="0.01"
              step="0.01"
              value={maxCpc}
              onChange={(e) => setMaxCpc(e.target.value)}
              className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="sv-currency" className="text-sm font-medium">
              Currency
            </label>
            <input
              id="sv-currency"
              type="text"
              maxLength={3}
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
              className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sv-daily-budget" className="text-sm font-medium">
              Daily budget (optional)
            </label>
            <input
              id="sv-daily-budget"
              type="number"
              min="0"
              step="0.01"
              placeholder="No cap"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="sv-start" className="text-sm font-medium">
              Forecast start
            </label>
            <input
              id="sv-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="sv-end" className="text-sm font-medium">
              Forecast end
            </label>
            <input
              id="sv-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeAdultKeywords}
            onChange={(e) => setIncludeAdultKeywords(e.target.checked)}
          />
          Include adult keywords
        </label>

        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="self-start rounded-md bg-blue-600 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 hover:bg-blue-700 transition-colors"
        >
          {loading ? "Fetching estimates…" : "Get search volume & forecast"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {forecast && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Clicks" value={formatSearches(forecast.clicks)} />
          <StatCard label="Cost" value={formatBidMicros(forecast.costMicros, currencyCode || "USD")} />
          <StatCard label="Avg. CPC" value={formatBidMicros(forecast.averageCpcMicros, currencyCode || "USD")} />
          <StatCard label="Conversions" value={formatSearches(forecast.conversions)} />
          <StatCard label="Avg. CPA" value={formatBidMicros(forecast.averageCpaMicros, currencyCode || "USD")} />
        </div>
      )}

      {searchVolume && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-black/60 dark:text-white/60">Search volume by keyword</p>
          <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/15">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/15 text-left">
                  <th className="px-3 py-2 font-medium">Keyword</th>
                  <th className="px-3 py-2 font-medium">Avg. monthly searches</th>
                  <th className="px-3 py-2 font-medium">Competition</th>
                  <th className="px-3 py-2 font-medium">Top of page bid (low)</th>
                  <th className="px-3 py-2 font-medium">Top of page bid (high)</th>
                </tr>
              </thead>
              <tbody>
                {searchVolume.map((row) => {
                  const comp = COMPETITION_LABELS[row.competition] ?? COMPETITION_LABELS.UNSPECIFIED;
                  return (
                    <tr key={row.text} className="border-b border-black/5 dark:border-white/10 last:border-0">
                      <td className="px-3 py-2 font-medium">{row.text}</td>
                      <td className="px-3 py-2">{formatSearches(row.avgMonthlySearches)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${comp.color}`}>
                          {comp.label}
                        </span>
                      </td>
                      <td className="px-3 py-2">{formatBidMicros(row.lowTopOfPageBidMicros)}</td>
                      <td className="px-3 py-2">{formatBidMicros(row.highTopOfPageBidMicros)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/15 p-4 flex flex-col gap-1">
      <span className="text-xs text-black/50 dark:text-white/50">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}
