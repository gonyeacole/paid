"use client";

import { useState } from "react";
import KeywordIdeasTool from "@/components/KeywordIdeasTool";
import SearchVolumeForecastTool from "@/components/SearchVolumeForecastTool";

const TABS = [
  { id: "discover", label: "Discover new keywords" },
  { id: "forecast", label: "Get search volume and forecasts" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdsEstimatorTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("forecast");

  return (
    <div className="flex flex-col gap-6">
      <div className="w-full max-w-5xl mx-auto flex gap-2 border-b border-black/10 dark:border-white/15">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "discover" ? <KeywordIdeasTool /> : <SearchVolumeForecastTool />}
    </div>
  );
}
