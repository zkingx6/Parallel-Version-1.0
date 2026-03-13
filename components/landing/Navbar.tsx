"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn, scrollToSection } from "@/lib/utils";
import { ParallelLogo } from "./ParallelLogo";
import { ParallelWordmark } from "@/components/ui/parallel-wordmark";
import { useActiveSection } from "@/lib/useActiveSection";

const navLinks = [
  { id: "problem", label: "Problem" },
  { id: "solution", label: "Solution" },
  { id: "how-it-works", label: "How it works" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const activeSection = useActiveSection();

  const isLanding = pathname === "/" || pathname === "/landing";

  return (
    <header className="sticky top-0 z-[100] w-full pt-4 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <nav
          className={cn(
            "relative flex h-14 items-center rounded-full px-6 py-3 sm:px-8",
            "bg-white/80 backdrop-blur-md",
            "border border-border",
            "shadow-[0_4px_24px_-4px_rgba(44,43,42,0.08),0_0_1px_rgba(44,43,42,0.04)]",
            "transition-shadow duration-200 hover:shadow-[0_8px_30px_-6px_rgba(44,43,42,0.1),0_0_1px_rgba(44,43,42,0.04)]"
          )}
        >
          {/* Left: logo */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {isLanding ? (
              <button
                type="button"
                onClick={(e) => {
                  console.log("[URL_DEBUG] logo BEFORE", {
                    href: window.location.href,
                    hash: window.location.hash,
                    target: (e.target as HTMLElement)?.tagName,
                    activeElement: document.activeElement?.tagName,
                    time: performance.now().toFixed(1),
                  })
                  e.preventDefault()
                  window.scrollTo({ top: 0, behavior: "smooth" })
                  console.log("[URL_DEBUG] logo AFTER scrollTo", {
                    href: window.location.href,
                    hash: window.location.hash,
                    time: performance.now().toFixed(1),
                  })
                  setTimeout(() => {
                    console.log("[URL_DEBUG] logo 50ms", {
                      href: window.location.href,
                      hash: window.location.hash,
                      time: performance.now().toFixed(1),
                    })
                  }, 50)
                  setTimeout(() => {
                    console.log("[URL_DEBUG] logo 200ms", {
                      href: window.location.href,
                      hash: window.location.hash,
                      time: performance.now().toFixed(1),
                    })
                  }, 200)
                }}
                className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground hover:text-muted-foreground transition-colors"
              >
                <ParallelLogo className="size-6 shrink-0" />
                <ParallelWordmark />
              </button>
            ) : (
              <Link
                href="/"
                className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground hover:text-muted-foreground transition-colors"
              >
                <ParallelLogo className="size-6 shrink-0" />
                <ParallelWordmark />
              </Link>
            )}
          </div>

          {/* Center: nav links — absolutely centered relative to full navbar */}
          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return isLanding ? (
                <button
                  key={link.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    scrollToSection(link.id)
                  }}
                  className={cn(
                    "text-sm font-medium transition-colors duration-200 nav-link",
                    isActive && "nav-link-active"
                  )}
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.id}
                  href={`/?section=${link.id}`}
                  className={cn(
                    "text-sm font-medium transition-colors duration-200 nav-link",
                    isActive && "nav-link-active"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right: auth / CTA */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3 sm:gap-4">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="hidden sm:inline-flex items-center justify-center rounded-full bg-chart-1 text-white px-5 py-2 text-sm font-medium hover:opacity-90 transition-colors duration-200"
            >
              Start free
            </Link>
            <button
              className="md:hidden p-2 -mr-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        {mobileOpen && (
          <div
            className={cn(
              "mt-3 rounded-2xl overflow-hidden",
              "bg-card/90 backdrop-blur-xl",
              "border border-border",
              "shadow-[0_8px_30px_-6px_rgba(44,43,42,0.12)]"
            )}
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => {
                const isActive = activeSection === link.id;
                return isLanding ? (
                  <button
                    key={link.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      scrollToSection(link.id)
                      setMobileOpen(false)
                    }}
                    className={cn(
                      "block w-full text-left rounded-lg py-2.5 px-3 text-sm font-medium transition-colors nav-link",
                      isActive && "nav-link-active",
                      !isActive && "hover:bg-accent/30"
                    )}
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    key={link.id}
                    href={`/?section=${link.id}`}
                    className={cn(
                      "block rounded-lg py-2.5 px-3 text-sm font-medium transition-colors nav-link",
                      isActive && "nav-link-active",
                      !isActive && "hover:bg-accent/30"
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="mt-3 flex flex-col gap-2">
                <Link
                  href="/login"
                  className="flex items-center justify-center rounded-full px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
                  onClick={() => setMobileOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center justify-center rounded-full bg-chart-1 text-white px-4 py-3 text-sm font-medium hover:opacity-90 transition-colors duration-200"
                  onClick={() => setMobileOpen(false)}
                >
                  Start free
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
