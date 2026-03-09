"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

const pageBackLinkClass =
  "inline-flex items-center gap-1.5 text-[0.82rem] text-[#9ca3af] hover:text-[#6b7280] bg-transparent border-0 cursor-pointer p-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]/30 focus-visible:ring-offset-2"

type PageBackLinkProps = {
  href?: string
  onClick?: () => void
  children: React.ReactNode
  className?: string
}

export function PageBackLink({
  href,
  onClick,
  children,
  className,
}: PageBackLinkProps) {
  const baseClass = cn(pageBackLinkClass, className)
  const content = (
    <>
      <ArrowLeft size={14} />
      {children}
    </>
  )
  if (href != null) {
    return <Link href={href} className={baseClass}>{content}</Link>
  }
  return (
    <button type="button" onClick={onClick} className={baseClass}>
      {content}
    </button>
  )
}
