export const LOCATIONS = [
  { id: "2840", name: "United States" },
  { id: "2826", name: "United Kingdom" },
  { id: "2124", name: "Canada" },
  { id: "2036", name: "Australia" },
  { id: "2356", name: "India" },
  { id: "2276", name: "Germany" },
  { id: "2250", name: "France" },
  { id: "2724", name: "Spain" },
  { id: "2380", name: "Italy" },
  { id: "2528", name: "Netherlands" },
  { id: "2076", name: "Brazil" },
  { id: "2484", name: "Mexico" },
  { id: "2392", name: "Japan" },
  { id: "2702", name: "Singapore" },
  { id: "2710", name: "South Africa" },
] as const;

export const LANGUAGES = [
  { id: "1000", name: "English" },
  { id: "1003", name: "Spanish" },
  { id: "1002", name: "French" },
  { id: "1001", name: "German" },
  { id: "1004", name: "Italian" },
  { id: "1005", name: "Dutch" },
  { id: "1009", name: "Portuguese" },
  { id: "1019", name: "Japanese" },
  { id: "1017", name: "Hindi" },
  { id: "1027", name: "Chinese (simplified)" },
] as const;

export const COMPETITION_LABELS: Record<string, { label: string; color: string }> = {
  LOW: { label: "Low", color: "text-emerald-600 bg-emerald-50" },
  MEDIUM: { label: "Medium", color: "text-amber-600 bg-amber-50" },
  HIGH: { label: "High", color: "text-red-600 bg-red-50" },
  UNSPECIFIED: { label: "Unknown", color: "text-gray-500 bg-gray-100" },
  UNKNOWN: { label: "Unknown", color: "text-gray-500 bg-gray-100" },
};
