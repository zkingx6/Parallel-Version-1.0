import { cn } from "@/lib/utils";

/**
 * Parallel wordmark with the three "L" letters highlighted in the primary brand color (#3A7D73).
 * Use for product name display in navbars, headers, and footers.
 */
export function ParallelWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline", className)}>
      Para<span className="text-[#3A7D73]">ll</span>e<span className="text-[#3A7D73]">l</span>
    </span>
  );
}
