"use client";

import { useMemo, useState } from "react";
import { LOCATIONS, LANGUAGES, COMPETITION_LABELS } from "@/lib/constants";
import { formatSearches, formatBidMicros } from "@/lib/format";

type KeywordIdea = {
  text: string;
  avgMonthlySearches: number;
  competition: string;
  competitionIndex: number | null;
  lowTopOfPageBidMicros: number | null;
  highTopOfPageBidMicros: number | null;
  monthlySearchVolumes: { year: number | null; month: string | null; searches: number }[];
};

type SortKey = "text" | "avgMonthlySearches" | "competition" | "lowTopOfPageBidMicros" | "highTopOfPageBidMicros";

const COMPETITION_ORDER: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, UNKNOWN: -1, UNSPECIFIED: -1 };

export default function KeywordIdeasTool() {
  const [keywordsInput, setKeywordsInput] = useState("");
  const [url, setUrl] = useState("");
  const [locationId, setLocationId] = useState<string>(LOCATIONS[0].id);
  const [languageId, setLanguageId] = useState<string>(LANGUAGES[0].id);
  const [includeAdultKeywords, setIncludeAdultKeywords] = useState(false);
  const [ideas, setIdeas] = useState<KeywordIdea[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("avgMonthlySearches");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const keywords = useMemo(
    () =>
      keywordsInput
        .split(/[\n,]/)
        .map((k) => k.trim())
        .filter(Boolean),
    [keywordsInput]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setIdeas(null);

    try {
      const res = await fetch("/api/keyword-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords,
          url: url.trim(),
          locationIds: [locationId],
          languageId,
          includeAdultKeywords,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Request failed.");
      }
      setIdeas(data.ideas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const sortedIdeas = useMemo(() => {
    if (!ideas) return [];
    const copy = [...ideas];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "text") cmp = a.text.localeCompare(b.text);
      else if (sortKey === "avgMonthlySearches") cmp = a.avgMonthlySearches - b.avgMonthlySearches;
      else if (sortKey === "competition")
        cmp = (COMPETITION_ORDER[a.competition] ?? -1) - (COMPETITION_ORDER[b.competition] ?? -1);
      else if (sortKey === "lowTopOfPageBidMicros")
        cmp = (a.lowTopOfPageBidMicros ?? -1) - (b.lowTopOfPageBidMicros ?? -1);
      else if (sortKey === "highTopOfPageBidMicros")
        cmp = (a.highTopOfPageBidMicros ?? -1) - (b.highTopOfPageBidMicros ?? -1);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [ideas, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-xl border border-black/10 dark:border-white/15 p-6"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="keywords" className="text-sm font-medium">
            Seed keywords
          </label>
          <textarea
            id="keywords"
            placeholder={"running shoes\nmarathon training\nbest hiking boots"}
            value={keywordsInput}
            onChange={(e) => setKeywordsInput(e.target.value)}
            rows={3}
            className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-black/50 dark:text-white/50">
            One keyword per line or comma-separated. Up to 20.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="url" className="text-sm font-medium">
            Landing page URL (optional)
          </label>
          <input
            id="url"
            type="text"
            placeholder="https://example.com/products"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="location" className="text-sm font-medium">
              Location
            </label>
            <select
              id="location"
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
            <label htmlFor="language" className="text-sm font-medium">
              Language
            </label>
            <select
              id="language"
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
          disabled={loading || (keywords.length === 0 && !url.trim())}
          className="self-start rounded-md bg-blue-600 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 hover:bg-blue-700 transition-colors"
        >
          {loading ? "Fetching estimates…" : "Get keyword ideas"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {ideas && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-black/60 dark:text-white/60">
            {ideas.length} keyword idea{ideas.length === 1 ? "" : "s"}
          </p>
          <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/15">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/15 text-left">
                  <SortableHeader label="Keyword" active={sortKey === "text"} dir={sortDir} onClick={() => toggleSort("text")} />
                  <SortableHeader
                    label="Avg. monthly searches"
                    active={sortKey === "avgMonthlySearches"}
                    dir={sortDir}
                    onClick={() => toggleSort("avgMonthlySearches")}
                  />
                  <SortableHeader
                    label="Competition"
                    active={sortKey === "competition"}
                    dir={sortDir}
                    onClick={() => toggleSort("competition")}
                  />
                  <SortableHeader
                    label="Top of page bid (low)"
                    active={sortKey === "lowTopOfPageBidMicros"}
                    dir={sortDir}
                    onClick={() => toggleSort("lowTopOfPageBidMicros")}
                  />
                  <SortableHeader
                    label="Top of page bid (high)"
                    active={sortKey === "highTopOfPageBidMicros"}
                    dir={sortDir}
                    onClick={() => toggleSort("highTopOfPageBidMicros")}
                  />
                </tr>
              </thead>
              <tbody>
                {sortedIdeas.map((idea) => {
                  const comp = COMPETITION_LABELS[idea.competition] ?? COMPETITION_LABELS.UNSPECIFIED;
                  return (
                    <tr key={idea.text} className="border-b border-black/5 dark:border-white/10 last:border-0">
                      <td className="px-3 py-2 font-medium">{idea.text}</td>
                      <td className="px-3 py-2">{formatSearches(idea.avgMonthlySearches)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${comp.color}`}>
                          {comp.label}
                        </span>
                      </td>
                      <td className="px-3 py-2">{formatBidMicros(idea.lowTopOfPageBidMicros)}</td>
                      <td className="px-3 py-2">{formatBidMicros(idea.highTopOfPageBidMicros)}</td>
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

function SortableHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th className="px-3 py-2 font-medium select-none">
      <button type="button" onClick={onClick} className="flex items-center gap-1 hover:underline">
        {label}
        {active && <span className="text-xs">{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}
