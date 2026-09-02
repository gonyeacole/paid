export function formatSearches(value: number): string {
  if (value <= 0) return "< 10";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatBidMicros(micros: number | null, currency = "USD"): string {
  if (micros === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(micros / 1_000_000);
}
