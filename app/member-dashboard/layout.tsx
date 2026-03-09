import { Suspense } from "react"

export default function MemberDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
          <p className="text-[0.88rem] text-[#9ca3af]">Loading…</p>
        </div>
      }
    >
      {children}
    </Suspense>
  )
}
