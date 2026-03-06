import Link from "next/link"
import { createServerSupabase } from "@/lib/supabase-server"
import {
  ensureDefaultTemplate,
  getWorkingDaysSummary,
  getTimeRangesSummary,
  getHardNoSummary,
} from "@/lib/availability"
import { getTimezoneDisplayLabelNow } from "@/lib/timezone"

export default async function AvailabilityPage() {
  const supabase = await createServerSupabase()
  const template = await ensureDefaultTemplate(supabase)

  const workingDays = getWorkingDaysSummary(template.weekly_hours)
  const timeRanges = getTimeRangesSummary(template.weekly_hours)
  const hardNoSummary = getHardNoSummary(template.weekly_hard_no)

  return (
    <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
        Availability
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground mb-10">
        Configure your default availability for meetings.
      </p>

      <section className="rounded-xl border border-border/50 bg-card p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">{template.name}</h3>
            <p className="text-sm text-muted-foreground">
              {getTimezoneDisplayLabelNow(template.timezone)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {workingDays} · {timeRanges}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Hard boundaries: {hardNoSummary}
            </p>
          </div>
          <Link
            href="/availability/default"
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors shrink-0"
          >
            Edit
          </Link>
        </div>
      </section>
    </main>
  )
}
