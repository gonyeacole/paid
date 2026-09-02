import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ads Keyword Estimator",
  description:
    "Keyword ideas, search volume, competition, and bid estimates powered by the Google Ads API.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
