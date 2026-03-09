"use client";

import Link from "next/link";
import { Container } from "@/components/ui";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/80 backdrop-blur-sm py-12 md:py-16 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.04)]">
      <Container>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="font-semibold text-foreground">Parallel</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Fair meeting rotation for global teams
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <Link
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Privacy
            </Link>
            <Link
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Terms
            </Link>
            <Link
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Contact
            </Link>
          </div>
        </div>
        <p className="mt-8 pt-8 border-t border-border text-sm text-muted-foreground">
          © {new Date().getFullYear()} Parallel. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
