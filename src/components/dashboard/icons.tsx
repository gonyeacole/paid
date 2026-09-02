import type { SVGProps } from "react";

export function IconWallet(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        d="M3 6.5A2.5 2.5 0 0 1 5.5 4h9A2.5 2.5 0 0 1 17 6.5v7a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 3 13.5v-7Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13 10.25a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 8h11.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSearch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth={1.5} stroke="currentColor" {...props}>
      <circle cx="9" cy="9" r="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m17 17-3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTrendingUp(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path d="M3 13.5 8 8.5l3 3 6-6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.5 5.5H17V10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconExternalLink(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path d="M8 5H5a1.5 1.5 0 0 0-1.5 1.5v8A1.5 1.5 0 0 0 5 16h8a1.5 1.5 0 0 0 1.5-1.5v-3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.5 3.5H16.5V8.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 4 9 11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTarget(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth={1.5} stroke="currentColor" {...props}>
      <circle cx="10" cy="10" r="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconCalendar(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth={1.5} stroke="currentColor" {...props}>
      <rect x="3.5" y="4.5" width="13" height="12" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 8h13M7 3v3M13 3v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
