import { cn } from "@/lib/utils";

/** Simple CMC wordmark. Replace the contents with your real logo (an <img src="/logo.svg" />) any time. */
export function CmcLogo({ heightClass = "h-8", className }: { heightClass?: string; className?: string }) {
  return (
    <svg viewBox="0 0 120 40" className={cn(heightClass, "w-auto text-white", className)} role="img" aria-label="CMC">
      <rect x="1" y="1" width="38" height="38" rx="8" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.9" />
      <path d="M12 14h16M12 20h16M12 26h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <text x="48" y="28" fill="currentColor" fontFamily="inherit" fontSize="22" fontWeight="700" letterSpacing="2">
        CMC
      </text>
    </svg>
  );
}
