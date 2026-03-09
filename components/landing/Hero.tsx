"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { Container, RotatingPhrase } from "@/components/ui";
import { DemoSchedulerPreview } from "@/components/demo";

const GlobeBackground = dynamic(
  () => import("@/components/ui/GlobeBackground").then((m) => ({ default: m.GlobeBackground })),
  { ssr: false }
);

export function Hero() {
  return (
    <section className="relative pt-0 pb-24 md:pb-32 bg-gradient-to-b from-background via-background to-primary/[0.02]">
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        <GlobeBackground />
      </div>
      <div className="relative z-10 pt-20 md:pt-24">
        <Container size="narrow">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-medium text-primary mb-8 shadow-sm">
              🌎 For teams that care about each other&apos;s time
            </span>

            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl md:leading-[1.1]">
              Fairer meeting times for global teams
            </h1>

            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
              Parallel helps teams rotate <RotatingPhrase />
            </p>

            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
              Across time zones, someone always takes the late meeting or the
              early morning call. Parallel rotates who adjusts — not perfectly
              equal, but shared more intentionally over time.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20"
              >
                Start rotating meeting times
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium text-foreground hover:bg-accent hover:border-primary/30 transition-all duration-200"
              >
                See how it works
              </a>
            </div>
          </div>
        </Container>

        <div className="mx-auto w-full max-w-5xl px-5 sm:px-6 lg:px-8 mt-16 md:mt-24">
          <DemoSchedulerPreview />
        </div>
      </div>
    </section>
  );
}
