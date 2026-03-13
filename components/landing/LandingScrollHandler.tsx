"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { scrollToSection, isValidSectionId } from "@/lib/utils"
import { installLandingUrlDebug } from "@/lib/landing-debug-url"

/**
 * Handles ?section=X on landing page load: scrolls to section and cleans URL.
 * Ensures navigation from other pages (e.g. /pricing redirect) scrolls without hash.
 * Also clears any stray hash from URL (e.g. old bookmarks).
 */
export function LandingScrollHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    installLandingUrlDebug()
    const section = searchParams?.get("section") ?? null
    if (isValidSectionId(section)) {
      requestAnimationFrame(() => scrollToSection(section))
      router.replace("/", { scroll: false })
      return
    }
    // Clear any hash (e.g. #solution, #top from old links)
    if (typeof window !== "undefined" && window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search)
    }
  }, [searchParams, router])

  return null
}
