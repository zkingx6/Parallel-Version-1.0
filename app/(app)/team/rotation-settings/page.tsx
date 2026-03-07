"use client"

import { useState } from "react"
import Link from "next/link"

// We store all scheduling rules in team base timezone.
// Display times are always converted to viewer's timezone before rendering.
// Users never see the canonical timezone.
//
// System Rule:
// Any availability change requires explicit owner confirmation.
// No automatic meeting adjustment.
// No emergency override mode.
// Parallel never modifies confirmed schedules automatically.
const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const

const HOURS = Array.from({ length: 24 }, (_, i) => ({ value: i, label: `${i.toString().padStart(2, "0")}:00` }))
const MINUTES = [
  { value: 0, label: "00" },
  { value: 15, label: "15" },
  { value: 30, label: "30" },
  { value: 45, label: "45" },
] as const

type WindowPoint = { day: number; hour: number; minute: number }

const initialTeamConfig = {
  teamTimezone: "America/New_York",
  updateWindow: {
    opens: { day: 6, hour: 0, minute: 0 } as WindowPoint, // Saturday 00:00
    closes: { day: 0, hour: 18, minute: 0 } as WindowPoint, // Sunday 18:00
  },
}

// --- Convert team window to viewer timezone (Intl only) ---
// Converts stored team-time values to display string in viewer's timezone.
function convertTeamWindowToViewer(
  teamConfig: typeof initialTeamConfig,
  viewerTimezone: string
): { opens: string; closes: string } {
  const { teamTimezone, updateWindow } = teamConfig

  // Create a date in team timezone by using UTC offset. Get offset from Intl formatter.
  const getOffsetMinutes = (tz: string, d: Date): number => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "shortOffset",
      }).formatToParts(d)
      const tzPart = parts.find((p) => p.type === "timeZoneName")?.value ?? ""
      const match = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
      if (!match) return 0
      const sign = match[1] === "+" ? 1 : -1
      const h = parseInt(match[2], 10)
      const m = parseInt(match[3] ?? "0", 10)
      return sign * (h * 60 + m)
    } catch {
      return 0
    }
  }

  const toUTC = (point: WindowPoint, tz: string): Date => {
    const dayOffset = (point.day + 1) % 7
    const localDate = new Date(Date.UTC(2025, 0, 4 + dayOffset, point.hour, point.minute, 0))
    const offsetMin = getOffsetMinutes(tz, localDate)
    return new Date(localDate.getTime() - offsetMin * 60 * 1000)
  }

  const formatUTCInViewer = (utcDate: Date, viewerTz: string): string => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: viewerTz,
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    return formatter.format(utcDate)
  }

  const opensUTC = toUTC(updateWindow.opens, teamTimezone)
  const closesUTC = toUTC(updateWindow.closes, teamTimezone)

  return {
    opens: formatUTCInViewer(opensUTC, viewerTimezone),
    closes: formatUTCInViewer(closesUTC, viewerTimezone),
  }
}

export default function RotationSettingsPage() {
  const [teamConfig, setTeamConfig] = useState(initialTeamConfig)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)

  const [draftOpens, setDraftOpens] = useState(teamConfig.updateWindow.opens)
  const [draftCloses, setDraftCloses] = useState(teamConfig.updateWindow.closes)

  const viewerTimezone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC"

  const mockRotation = {
    updates: [
      { name: "Alex", action: "updated availability", time: "3h ago" },
      { name: "Maria", action: "updated availability", time: "1d ago" },
      { name: "Tom", action: "updated availability", time: "2d ago" },
    ],
    health: {
      burdenRange: "2–6 hrs",
      overlapHealth: "Stable" as "Stable" | "At Risk",
      nextRotation: "Safe" as "Safe" | "Needs Review",
    },
  }

  const isStable = mockRotation.health.overlapHealth === "Stable"
  const isSafe = mockRotation.health.nextRotation === "Safe"

  const windowDisplay = convertTeamWindowToViewer(teamConfig, viewerTimezone)

  const openEditDrawer = () => {
    setDraftOpens({ ...teamConfig.updateWindow.opens })
    setDraftCloses({ ...teamConfig.updateWindow.closes })
    setEditDrawerOpen(true)
  }

  const saveEdit = () => {
    setTeamConfig({
      ...teamConfig,
      updateWindow: { opens: { ...draftOpens }, closes: { ...draftCloses } },
    })
    setEditDrawerOpen(false)
  }

  const cancelEdit = () => {
    setEditDrawerOpen(false)
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <Link
        href="/meetings"
        className="mb-8 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Teams
      </Link>

      <header className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Availability Rules
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Control when members can update availability.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="text-base font-semibold text-neutral-800">
              Availability Update Window
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Weekly window when members can submit updates
            </p>
            <div className="mt-4 space-y-1 text-sm text-neutral-700">
              <p>Opens: {windowDisplay.opens}</p>
              <p>Closes: {windowDisplay.closes}</p>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Times are automatically shown in your local timezone.
            </p>
            <button
              type="button"
              onClick={openEditDrawer}
              className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-all duration-200"
            >
              Edit Window
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="text-base font-semibold text-neutral-800">
              Recent Updates
            </h2>
            <ul className="mt-4 divide-y divide-neutral-100">
              {mockRotation.updates.map((u, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <span className="text-sm text-neutral-700">
                    {u.name} {u.action}
                  </span>
                  <span className="text-xs text-neutral-500">{u.time}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="text-base font-semibold text-neutral-800">
              Rotation Health
            </h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">
                  This month burden spread
                </span>
                <span className="text-sm font-medium text-neutral-800">
                  {mockRotation.health.burdenRange}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Overlap health</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isStable ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {mockRotation.health.overlapHealth}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Next rotation</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isSafe ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {mockRotation.health.nextRotation}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Window drawer - overlay starts below nav (top: 4rem) so nav stays clickable */}
      {editDrawerOpen && (
        <>
          <div
            className="fixed inset-0 top-16 z-40 bg-black/30 transition-all duration-200"
            style={{ top: "4rem" }}
            onClick={cancelEdit}
            aria-hidden
          />
          <div
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-neutral-200 bg-white shadow-xl transition-all duration-200"
            style={{ top: "4rem", height: "calc(100vh - 4rem)" }}
          >
            <div className="flex h-full flex-col p-6">
              <h2 className="text-lg font-semibold text-neutral-800">
                Edit Availability Update Window
              </h2>

              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-neutral-700">Opens</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <select
                      value={draftOpens.day}
                      onChange={(e) =>
                        setDraftOpens((p) => ({ ...p, day: parseInt(e.target.value, 10) }))
                      }
                      className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm"
                    >
                      {DAYS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={draftOpens.hour}
                      onChange={(e) =>
                        setDraftOpens((p) => ({ ...p, hour: parseInt(e.target.value, 10) }))
                      }
                      className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm"
                    >
                      {HOURS.map((h) => (
                        <option key={h.value} value={h.value}>
                          {h.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={draftOpens.minute}
                      onChange={(e) =>
                        setDraftOpens((p) => ({ ...p, minute: parseInt(e.target.value, 10) }))
                      }
                      className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm"
                    >
                      {MINUTES.map((m) => (
                        <option key={m.value} value={m.value}>
                          :{m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-neutral-700">Closes</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <select
                      value={draftCloses.day}
                      onChange={(e) =>
                        setDraftCloses((p) => ({ ...p, day: parseInt(e.target.value, 10) }))
                      }
                      className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm"
                    >
                      {DAYS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={draftCloses.hour}
                      onChange={(e) =>
                        setDraftCloses((p) => ({ ...p, hour: parseInt(e.target.value, 10) }))
                      }
                      className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm"
                    >
                      {HOURS.map((h) => (
                        <option key={h.value} value={h.value}>
                          {h.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={draftCloses.minute}
                      onChange={(e) =>
                        setDraftCloses((p) => ({ ...p, minute: parseInt(e.target.value, 10) }))
                      }
                      className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm"
                    >
                      {MINUTES.map((m) => (
                        <option key={m.value} value={m.value}>
                          :{m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-auto flex justify-end gap-2 pt-8">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-all duration-200"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
