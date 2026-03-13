import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Smooth scroll to a section by id without updating the URL. Never adds hash. */
export function scrollToSection(id: string) {
  if (typeof window === "undefined") return
  const clearHash = () => {
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search)
    }
  }
  clearHash()
  if (id === "top") {
    window.scrollTo({ top: 0, behavior: "smooth" })
    setTimeout(clearHash, 0)
    return
  }
  document.getElementById(id)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  })
  setTimeout(clearHash, 0)
  setTimeout(clearHash, 100)
}

const VALID_SECTION_IDS = ["problem", "solution", "how-it-works", "pricing", "faq"]

/** Check if a string is a valid section id for scroll. */
export function isValidSectionId(id: string | null): id is string {
  return typeof id === "string" && VALID_SECTION_IDS.includes(id)
}
