import { notFound } from "next/navigation"
import Link from "next/link"
import { createServiceSupabase } from "@/lib/supabase-server"
import { getPublicScheduleByToken } from "@/lib/public-schedule"
import { RotationOutput } from "@/components/parallel/rotation-output"
import { ParallelWordmark } from "@/components/ui/parallel-wordmark"

export default async function PublicSchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ shareToken: string }>
  searchParams?: Promise<{ _debug?: string }>
}) {
  const rawParams = await params
  const shareToken = rawParams.shareToken
  const rawSearchParams = await searchParams?.catch(() => ({} as Record<string, string | undefined>))
  const debug = rawSearchParams?._debug === "1"

  console.warn("[shareToken-page] params.shareToken=" + shareToken + " searchParams=" + JSON.stringify(rawSearchParams) + " debug=" + debug)

  if (debug) {
    const supabase = createServiceSupabase()
    const { data: row, error } = await supabase
      .from("schedules")
      .select("id, name, share_token")
      .eq("share_token", shareToken)
      .single()

    const ok = !!row && !error
    return (
      <div className="min-h-screen bg-[#f7f8fa] p-8 font-mono text-sm">
        <h1 className="text-lg font-semibold mb-4">DEBUG ROUTE ACTIVE</h1>
        <pre className="bg-white p-4 rounded border whitespace-pre-wrap">
{`shareToken: ${shareToken}
debug: ${String(debug)}
fetch status: ${ok ? "OK" : "FAILED"}
${ok
  ? `id: ${row.id}
name: ${row.name}
share_token: ${row.share_token}`
  : `error: ${error?.message ?? "unknown"}
code: ${error?.code ?? "—"}
details: ${error?.details ?? "—"}`}
`}
        </pre>
      </div>
    )
  }

  const data = await getPublicScheduleByToken(shareToken)

  if (!data || !data.weeks.length) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] flex flex-col">
      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] mb-2 font-semibold">
            {data.scheduleName}
          </h1>
          <p className="text-[#9ca3af] text-[0.88rem] mb-10">
            {data.meetingTitle} — time rotates, burden distributed transparently.
          </p>

          <div className="space-y-10 sm:space-y-12">
            <RotationOutput
              weeks={data.weeks}
              team={data.team}
              displayTimezone={data.displayTimezone}
              useBaseTime={data.useBaseTime}
            />
          </div>
        </div>
      </main>

      <footer className="py-6 text-center border-t border-[#edeef0] bg-white/60">
        <p className="text-[0.8rem] text-[#9ca3af]">
          Powered by{" "}
          <Link
            href="/"
            className="text-[#3A7D73] hover:text-[#2d635b] font-medium transition-colors inline"
          >
            <ParallelWordmark />
          </Link>
          {" — "}fair scheduling for distributed teams.
        </p>
      </footer>
    </div>
  )
}
