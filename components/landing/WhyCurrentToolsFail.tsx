"use client";

import Link from "next/link";
import { CalendarDays, RefreshCw, Check, X, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const comparisonFeatures = [
  { label: "Find available time", others: true, parallel: true },
  { label: "Track who adjusted", others: false, parallel: true },
  { label: "Rotate burden fairly", others: false, parallel: true },
  { label: "Show fairness score", others: false, parallel: true },
  { label: "Team-wide visibility", others: false, parallel: true },
  { label: "Automatic rotation", others: false, parallel: true },
  { label: "Burden history", others: false, parallel: true },
];

export function WhyCurrentToolsFail() {
  return (
    <section
      id="tools"
      className="scroll-mt-24 pt-16 pb-24 md:pt-20 md:pb-32 bg-background"
    >
      <Container>
        <div className="text-center mb-12 md:mb-16">
          <p className="section-label">Why current tools fall short</p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Finding a time isn&apos;t the same as sharing the cost
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground text-lg leading-relaxed">
            Tools like Calendly and Doodle help find a time when everyone is
            available. But they don&apos;t show who&apos;s taking the late meeting or
            early call — or help teams rotate who does.
          </p>
        </div>

        {/* Comparison cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Availability tools card */}
          <div
            className={cn(
              "rounded-2xl border-2 border-border bg-card p-8 shadow-sm",
              "transition-all duration-200",
              "hover:border-muted-foreground/30 hover:shadow-md"
            )}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="size-10 rounded-xl bg-muted flex items-center justify-center">
                <CalendarDays size={20} className="text-muted-foreground" />
              </div>
              <h3 className="text-[1.05rem] font-semibold text-foreground">
                Availability tools
              </h3>
            </div>
            <p className="text-muted-foreground text-[0.92rem] leading-relaxed">
              Optimize for overlap. These tools answer one question: &ldquo;When
              can everyone join?&rdquo;
            </p>
            <p className="text-muted-foreground text-[0.92rem] leading-relaxed mt-2">
              They don&apos;t answer the harder one: &ldquo;Who is taking the
              inconvenient time this week?&rdquo;
            </p>
          </div>

          {/* Parallel card */}
          <div
            className={cn(
              "rounded-2xl border-2 border-primary/40 bg-card p-8 shadow-sm",
              "transition-all duration-200",
              "hover:border-primary/60 hover:shadow-md"
            )}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <RefreshCw size={20} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                <h3 className="text-[1.05rem] font-semibold text-foreground">
                  Parallel
                </h3>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary shrink-0">
                  Fair by design
                </span>
              </div>
            </div>
            <p className="text-muted-foreground text-[0.92rem] leading-relaxed">
              Shows who&apos;s taking late meetings and early calls. Tracks who
              has adjusted and how often. Then rotates inconvenient meeting
              times so the burden is shared across the team over time.
            </p>
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm mb-12">
          <div className="grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_120px_120px] md:grid-cols-[1fr_140px_140px] items-center px-4 sm:px-6 py-4 bg-muted/30 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Feature
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
              Others
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary text-center">
              Parallel
            </span>
          </div>
          {comparisonFeatures.map((feature) => (
            <div
              key={feature.label}
              className="grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_120px_120px] md:grid-cols-[1fr_140px_140px] items-center px-4 sm:px-6 py-3.5 border-b border-border/60 last:border-b-0 hover:bg-muted/20 transition-colors"
            >
              <span className="text-sm text-foreground">{feature.label}</span>
              <div className="flex justify-center">
                {feature.others ? (
                  <div className="size-6 rounded-full bg-muted flex items-center justify-center">
                    <Check size={13} className="text-muted-foreground" />
                  </div>
                ) : (
                  <div className="size-6 rounded-full bg-destructive/10 flex items-center justify-center">
                    <X size={13} className="text-destructive" />
                  </div>
                )}
              </div>
              <div className="flex justify-center">
                <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check size={13} className="text-primary" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <div className="flex justify-center">
          <Button
            asChild
            variant="pricing-secondary"
            size="lg"
            className="rounded-full px-8 py-6 text-base font-medium"
          >
            <Link href="/signup" className="gap-2.5">
              Start free
              <ArrowRight size={16} className="shrink-0" />
            </Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
