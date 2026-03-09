"use client"

import { useState, useEffect } from "react"

const SECTION_IDS = ["problem", "solution", "how-it-works", "pricing", "faq"]

/**
 * Returns the id of the section currently in view (for landing nav highlighting).
 */
export function useActiveSection(): string {
  const [activeSection, setActiveSection] = useState<string>("")

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("id")
            if (id) setActiveSection(id)
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    )

    for (const id of SECTION_IDS) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [])

  return activeSection
}
