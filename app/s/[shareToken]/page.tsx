import { notFound } from "next/navigation"
import Link from "next/link"
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
    let data: Awaited<ReturnType<typeof getPublicScheduleByToken>> = null
    let err: unknown = null
    try {
      data = await getPublicScheduleByToken(shareToken)
    } catch (e) {
      err = e
    }

    const ok = !!data && !err
    const errObj = err as { message?: string; code?: string; stack?: string } | null
    return (
      <div className="min-h-screen bg-[#f7f8fa] p-8 font-mono text-sm">
        <h1 className="text-lg font-semibold mb-4">DEBUG ROUTE ACTIVE</h1>
        <pre className="bg-white p-4 rounded border whitespace-pre-wrap">
{`function call: ${ok ? "SUCCESS" : "FAILED"}
${ok && data
  ? `schedule id: ${data.scheduleId}
team id: ${data.teamId}
weeks count: ${data.weeks.length}`
  : errObj
    ? `error message: ${errObj.message ?? String(err)}
error code: ${errObj.code ?? "—"}
error stack: ${errObj.stack ?? "—"}`
    : "getPublicScheduleByToken returned null (no throw)"}
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
