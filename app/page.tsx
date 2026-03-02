import { Suspense } from "react"
import { ParallelApp } from "@/components/parallel/parallel-app"

export default function Home() {
  return (
    <Suspense>
      <ParallelApp />
    </Suspense>
  )
}
