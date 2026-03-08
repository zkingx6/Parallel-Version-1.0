import { PageBackLink } from "@/components/ui/page-back-link"

export default function SetupPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
      <PageBackLink href="/settings">Back</PageBackLink>
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4">
        Setup
      </h2>
      <p className="text-sm text-muted-foreground">Coming soon</p>
    </main>
  )
}
