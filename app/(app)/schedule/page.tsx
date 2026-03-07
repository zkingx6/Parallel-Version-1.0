export default function SchedulePage() {
  return (
    <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Schedule
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Meeting schedules and rotation history.
        </p>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-8 shadow-sm text-center">
        <p className="text-sm text-muted-foreground">
          Meeting schedules and rotation history will appear here.
        </p>
      </div>
    </main>
  )
}
