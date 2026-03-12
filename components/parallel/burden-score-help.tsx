"use client"

import { useState } from "react"
import { HelpCircle } from "lucide-react"
import { Popover } from "radix-ui"
import { cn } from "@/lib/utils"

const SCORE_BREAKDOWN = [
  { score: 0, label: "Within working hours" },
  { score: 1, label: "Slightly outside working hours" },
  { score: 2, label: "Moderately outside working hours" },
  { score: 3, label: "Far outside working hours" },
  { score: 4, label: "Very early or very late in local time" },
] as const

/**
 * Reusable help trigger that shows how burden scoring works.
 * Use in rotation planner, schedule analysis, and burden distribution sections.
 */
export function BurdenScoreHelp({
  className,
  triggerClassName,
}: {
  className?: string
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        asChild
        className={cn(triggerClassName)}
        aria-label="How burden scoring works"
      >
        <button
          type="button"
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-full text-muted-foreground/70",
            "hover:bg-muted/60 hover:text-muted-foreground transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "cursor-pointer touch-manipulation",
            className
          )}
          title="How scoring works"
        >
          <HelpCircle className="size-3.5" strokeWidth={2} aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={8}
          alignOffset={0}
          className={cn(
            "z-[100] w-[min(320px,calc(100vw-2rem))] rounded-lg border bg-popover p-4 shadow-lg",
            "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
            "data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2"
          )}
          onEscapeKeyDown={() => setOpen(false)}
        >
          <h4 className="text-sm font-semibold text-foreground mb-2">
            How burden scoring works
          </h4>
          <p className="text-[0.8125rem] text-muted-foreground leading-relaxed mb-3">
            Parallel measures inconvenience based on how far a meeting falls outside
            each person&apos;s normal working hours.
          </p>
          <div className="space-y-1.5 mb-3">
            {SCORE_BREAKDOWN.map(({ score, label }) => (
              <div
                key={score}
                className="flex items-baseline gap-2 text-[0.8125rem]"
              >
                <span className="tabular-nums font-medium text-foreground w-4 shrink-0">
                  {score}
                </span>
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-[0.8125rem] text-muted-foreground leading-relaxed mb-3">
            Total burden is the sum of these scores across all weeks in the rotation.
          </p>
          <p className="text-[0.8125rem] text-muted-foreground leading-relaxed">
            Parallel doesn&apos;t only reduce total inconvenience—it also rotates harder
            meeting times across weeks so the same person isn&apos;t consistently stuck
            with the worst slot.
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
