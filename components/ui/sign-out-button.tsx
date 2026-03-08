"use client"

import { cn } from "@/lib/utils"

const signOutButtonClass =
  "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-destructive hover:text-destructive/90 hover:bg-destructive/10 transition-colors cursor-pointer -ml-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

type SignOutButtonProps = {
  onClick: () => void
  children?: React.ReactNode
  className?: string
}

/**
 * Consistent Sign out action. Pill styling with subtle light red hover background.
 * Use on owner and member account pages.
 */
export function SignOutButton({
  onClick,
  children = "Sign out",
  className,
}: SignOutButtonProps) {
  return (
    <button type="button" onClick={onClick} className={cn(signOutButtonClass, className)}>
      {children}
    </button>
  )
}
