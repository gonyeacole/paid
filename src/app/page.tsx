import AdsEstimatorTabs from "@/components/AdsEstimatorTabs";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col gap-8 px-6 py-12 sm:px-10">
      <header className="w-full max-w-5xl mx-auto flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Ads Keyword Estimator</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Search volume, competition, bid estimates, campaign forecasts, and live budget
          pacing — sourced directly from the Google Ads API.
        </p>
      </header>
      <AdsEstimatorTabs />
    </div>
  );
}
