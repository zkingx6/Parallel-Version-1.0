"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "@/components/ui";
import { ParallelLogo } from "./ParallelLogo";
import { ParallelWordmark } from "@/components/ui/parallel-wordmark";
import { FeedbackModal } from "@/components/feedback/feedback-modal";
import { createClient } from "@/lib/supabase";

export function Footer() {
  const pathname = usePathname();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user?.email) setUserEmail(session.user.email);
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="border-t border-border bg-card/80 backdrop-blur-sm py-12 md:py-16 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.04)]">
      <Container>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <ParallelLogo className="size-6 shrink-0" />
              <span className="font-semibold text-foreground">
                <ParallelWordmark />
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Fair meeting rotation for global teams
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Terms
            </Link>
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer bg-transparent border-0 p-0 font-inherit"
            >
              Contact
            </button>
          </div>
        </div>
        <p className="mt-8 pt-8 border-t border-border text-sm text-muted-foreground">
          © {new Date().getFullYear()} <ParallelWordmark />. All rights reserved.
        </p>
      </Container>

      <FeedbackModal
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        source="footer"
        defaultType="general"
        defaultEmail={userEmail}
        pagePath={pathname ?? undefined}
      />
    </footer>
  );
}
