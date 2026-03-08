"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

const pageBackLinkClass =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-primary/10 dark:hover:bg-primary/15 transition-colors duration-150 -ml-2 mb-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

type PageBackLinkProps = {
  /** When provided, renders a Link. */
  href?: string
  /** When provided (and no href), renders a button. Use for router.back(). */
  onClick?: () => void
  children: React.ReactNode
  className?: string
}

/**
 * Consistent page-level Back link. Use for all "Back", "Back to team", "Back to schedules", etc.
 * Pill styling with subtle hover background.
 */
export function PageBackLink({
  href,
  onClick,
  children,
  className,
}: PageBackLinkProps) {
  const baseClass = cn(pageBackLinkClass, className)
  if (href != null) {
    return (
      <Link href={href} className={baseClass}>
        <span aria-hidden>←</span>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={baseClass}>
      <span aria-hidden>←</span>
      {children}
    </button>
  )
}
