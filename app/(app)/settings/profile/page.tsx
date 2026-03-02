import Link from "next/link"

export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <span aria-hidden>←</span>
        Back
      </Link>
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4">
        Edit profile
      </h2>
      <p className="text-sm text-muted-foreground">Coming soon</p>
    </main>
  )
}
