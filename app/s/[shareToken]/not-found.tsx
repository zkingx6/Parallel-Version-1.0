import Link from "next/link"
import { ParallelWordmark } from "@/components/ui/parallel-wordmark"

export default function PublicScheduleNotFound() {
  return (
    <div className="min-h-screen bg-[#f7f8fa] flex flex-col items-center justify-center px-6">
      <h1 className="text-[1.5rem] font-semibold text-[#1a1a2e] mb-2">
        Schedule not found
      </h1>
      <p className="text-[#9ca3af] text-[0.88rem] mb-6 text-center max-w-sm">
        This link may be invalid or the schedule may have been removed.
      </p>
      <Link
        href="/"
        className="text-[0.88rem] font-medium text-[#3A7D73] hover:text-[#2d635b] transition-colors inline-flex items-center gap-1"
      >
        Go to <ParallelWordmark />
      </Link>
    </div>
  )
}
