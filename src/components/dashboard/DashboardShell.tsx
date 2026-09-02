"use client";

import { useState } from "react";
import KeywordIdeasTool from "@/components/KeywordIdeasTool";
import SearchVolumeForecastTool from "@/components/SearchVolumeForecastTool";
import BudgetTrackingTool from "@/components/BudgetTrackingTool";
import {
  IconWallet,
  IconSearch,
  IconTrendingUp,
  IconExternalLink,
  IconChevronRight,
} from "@/components/dashboard/icons";

const BUDGET_SUBTABS = [
  { id: "pacing", label: "Budget Pacing" },
  { id: "analytics", label: "Analytics" },
] as const;

type BudgetSubTabId = (typeof BUDGET_SUBTABS)[number]["id"];

const NAV_ITEMS = [
  { id: "budget", label: "Paid Dashboards", icon: IconWallet, children: BUDGET_SUBTABS },
  { id: "discover", label: "Discover new keywords", icon: IconSearch },
  { id: "forecast", label: "Search volume & forecasts", icon: IconTrendingUp },
] as const;

type TabId = (typeof NAV_ITEMS)[number]["id"];

export default function DashboardShell() {
  const [activeTab, setActiveTab] = useState<TabId>("budget");
  const [activeSubTab, setActiveSubTab] = useState<BudgetSubTabId>("pacing");
  const [budgetExpanded, setBudgetExpanded] = useState(true);

  const activeItem = NAV_ITEMS.find((item) => item.id === activeTab)!;
  const activeSubLabel =
    activeTab === "budget" ? BUDGET_SUBTABS.find((t) => t.id === activeSubTab)!.label : null;

  return (
    <div className="flex-1 flex bg-(--surface-page) text-(--text-primary)">
      <aside className="hidden sm:flex w-64 shrink-0 flex-col border-r border-black/10 dark:border-white/10 bg-(--surface-1) px-4 py-5">
        <div className="flex items-center gap-2.5 px-2 pb-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--series-1) text-white">
            <IconWallet className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">Ads Console</p>
            <p className="text-xs text-(--text-muted) leading-tight">Google Ads</p>
          </div>
        </div>

        <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-(--text-muted)">
          Main menu
        </p>
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;

            if ("children" in item && item.children) {
              const children = item.children;
              return (
                <div key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setBudgetExpanded((prev) => !prev);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-(--text-secondary) hover:bg-black/[0.04] dark:hover:bg-white/5 transition-colors"
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    <span className="truncate flex-1">{item.label}</span>
                    <IconChevronRight
                      className={`h-3.5 w-3.5 shrink-0 text-(--text-muted) transition-transform ${
                        budgetExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                  {budgetExpanded && (
                    <div className="ml-[18px] mt-0.5 flex flex-col gap-0.5 border-l border-black/10 dark:border-white/10 pl-3.5">
                      {children.map((child) => {
                        const isChildActive = activeTab === item.id && activeSubTab === child.id;
                        return (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => {
                              setActiveTab(item.id);
                              setActiveSubTab(child.id);
                            }}
                            className={`rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                              isChildActive
                                ? "bg-black/[0.06] dark:bg-white/10 font-medium text-(--text-primary)"
                                : "text-(--text-secondary) hover:bg-black/[0.04] dark:hover:bg-white/5"
                            }`}
                          >
                            {child.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-black/[0.06] dark:bg-white/10 font-medium text-(--text-primary)"
                    : "text-(--text-secondary) hover:bg-black/[0.04] dark:hover:bg-white/5"
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-black/10 dark:border-white/10">
          <a
            href="https://github.com/gonyeacole/paid#readme"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-(--text-secondary) hover:bg-black/[0.04] dark:hover:bg-white/5 transition-colors"
          >
            <IconExternalLink className="h-4.5 w-4.5 shrink-0" />
            Docs
          </a>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between gap-4 border-b border-black/10 dark:border-white/10 bg-(--surface-1) px-5 py-4 sm:px-8">
          <div>
            <h1 className="text-lg font-semibold">{activeSubLabel ?? activeItem.label}</h1>
            <p className="text-xs text-(--text-muted)">
              Overview / {activeItem.label}
              {activeSubLabel ? ` / ${activeSubLabel}` : ""}
            </p>
            {activeTab === "budget" && (
              <div className="flex sm:hidden gap-1 mt-2">
                {BUDGET_SUBTABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      activeSubTab === tab.id
                        ? "bg-black/[0.06] dark:bg-white/10 text-(--text-primary)"
                        : "text-(--text-secondary)"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <nav className="flex sm:hidden gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-label={item.label}
                className={`rounded-md p-2 ${
                  item.id === activeTab
                    ? "bg-black/[0.06] dark:bg-white/10"
                    : "text-(--text-secondary)"
                }`}
              >
                <item.icon className="h-4.5 w-4.5" />
              </button>
            ))}
          </nav>
        </header>

        <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8 overflow-x-hidden">
          {activeTab === "budget" && <BudgetTrackingTool activeSubTab={activeSubTab} />}
          {activeTab === "discover" && <KeywordIdeasTool />}
          {activeTab === "forecast" && <SearchVolumeForecastTool />}
        </main>
      </div>
    </div>
  );
}
