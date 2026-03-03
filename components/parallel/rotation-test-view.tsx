"use client"

/**
 * TEST-ONLY: Per-member rotation schedule view.
 * Isolated component. Safe to delete later.
 */
import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  DbMeeting,
  DbMemberSubmission,
  dbMeetingToConfig,
  dbMemberToTeamMember,
} from "@/lib/database.types"
import { generateRotation, canGenerateRotation, isNoViableTimeResult } from "@/lib/rotation"
import type { RotationWeekData } from "@/lib/types"
import { cn } from "@/lib/utils"

export function RotationTestView({
  meeting,
  members,
}: {
  meeting: DbMeeting
  members: DbMemberSubmission[]
}) {
  const team = useMemo(() => members.map(dbMemberToTeamMember), [members])
  const config = useMemo(() => dbMeetingToConfig(meeting), [meeting])
  const [weeks, setWeeks] = useState<RotationWeekData[] | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (team.length < 2) {
      setError("至少需要 2 名成员")
      setWeeks(null)
      return
    }
    const validation = canGenerateRotation(team, config)
    if (!validation.valid) {
      setError(validation.reason || "无法生成轮换")
      setWeeks(null)
      return
    }
    setError(null)
    const result = generateRotation(team, config)
    if (isNoViableTimeResult(result)) {
      setError("无可行会议时间，请调整约束")
      setWeeks(null)
    } else {
      setWeeks(result)
      setSelectedMemberId((prev) => prev ?? team[0]?.id ?? null)
    }
  }, [team, config])

  const memberMap = Object.fromEntries(team.map((m) => [m.id, m]))
  const selectedMember = selectedMemberId ? memberMap[selectedMemberId] : null

  return (
    <main className="mx-auto max-w-3xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            [测试] 按成员查看轮换
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {meeting.title} · 仅用于测试，可随时删除
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground/70">
            访问: /rotation/{meeting.id}/test
          </p>
        </div>
        <Link
          href={`/rotation/${meeting.id}`}
          className="text-sm text-primary hover:text-primary/80"
        >
          ← 返回正式页面
        </Link>
      </div>

      {error && (
        <p className="text-sm text-destructive mb-4">{error}</p>
      )}

      {weeks && weeks.length > 0 && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {team.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMemberId(m.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  selectedMemberId === m.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                {m.name}
              </button>
            ))}
          </div>

          {selectedMember && (
            <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
              <h3 className="text-sm font-semibold mb-3">
                {selectedMember.name} 的 8 周时间表
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 pr-4 font-medium">Week</th>
                      <th className="text-left py-2 pr-4 font-medium">日期</th>
                      <th className="text-left py-2 font-medium">本地时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeks.map((w) => {
                      const mt = w.memberTimes.find(
                        (m) => m.memberId === selectedMember.id
                      )
                      if (!mt) return null
                      return (
                        <tr
                          key={w.week}
                          className={cn(
                            "border-b border-border/30",
                            mt.discomfort !== "comfortable" && "bg-stretch/20"
                          )}
                        >
                          <td className="py-2.5 pr-4">Week {w.week}</td>
                          <td className="py-2.5 pr-4 text-muted-foreground">
                            {w.date}
                          </td>
                          <td className="py-2.5">
                            {mt.localTime}
                            {(mt.dateOffset !== undefined && mt.dateOffset !== 0) ||
                            mt.localDateLabel ? (
                              <span className="ml-1 text-muted-foreground">
                                ({mt.localDateLabel ?? (mt.dateOffset! > 0 ? "+1 day" : "-1 day")})
                              </span>
                            ) : null}
                            {mt.discomfort !== "comfortable" && (
                              <span className="ml-1.5 text-xs text-stretch-foreground">
                                {mt.discomfort}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {weeks && weeks.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">
          当前边界下无法生成可行轮换。
        </p>
      )}
    </main>
  )
}
