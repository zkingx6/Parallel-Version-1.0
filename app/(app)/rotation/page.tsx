"use client"

import Link from "next/link"

/**
 * Rotation page placeholder.
 * This page is reserved for meeting-level rotation planning.
 * The actual rotation flow lives at /rotation/[id] when a meeting is selected.
 */
export default function RotationPlaceholderPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <header className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Rotation
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Plan and generate a fair rotation for this meeting.
        </p>
      </header>

      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <p className="text-sm text-neutral-600">
          This page is reserved for meeting-level rotation planning (generate /
          preview / confirm).
        </p>
        <p className="mt-2 text-sm text-neutral-500">
          Select a meeting from{" "}
          <Link href="/meetings" className="text-primary hover:underline">
            Your meetings
          </Link>{" "}
          to access the rotation planner.
        </p>
        <button
          type="button"
          disabled
          className="mt-6 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white opacity-60"
        >
          Generate rotation
        </button>
      </div>
    </main>
  )
}
