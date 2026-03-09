"use client";

import { CalendarCheck, RotateCcw } from "lucide-react";
import { Container } from "@/components/ui";
import { cn } from "@/lib/utils";

export function WhyCurrentToolsFail() {
  return (
    <section className="scroll-mt-24 pt-16 pb-24 md:pt-20 md:pb-32 bg-background">
      <Container>
        <div className="text-center mb-12">
          <p className="section-label">Why current tools fall short</p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Finding a time isn&apos;t the same as sharing the cost
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
            Tools like Calendly and Doodle help find a time when everyone is
            available. But they don&apos;t show who&apos;s taking the late meeting or
            early call — or help teams rotate who does.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div
            className={cn(
              "rounded-xl border-2 border-border/60 bg-card p-8 shadow-sm",
              "transition-all duration-200 ease-out",
              "hover:border-border hover:shadow-md",
              "hover:-translate-y-1"
            )}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-background border border-border p-3">
                <CalendarCheck className="size-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">
                Availability tools
              </h3>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Optimize for overlap. These tools answer one question: &ldquo;When
              can everyone join?&rdquo; They don&apos;t answer the harder one:
              &ldquo;Who is taking the inconvenient time this week?&rdquo;
            </p>
          </div>

          <div
            className={cn(
              "rounded-xl border-2 border-primary/35 bg-primary/8 p-8 shadow-sm",
              "transition-all duration-200 ease-out",
              "hover:border-primary/50 hover:shadow-md",
              "hover:-translate-y-1"
            )}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-primary/15 border border-primary/25 p-3">
                <RotateCcw className="size-5 text-primary" strokeWidth={2} />
              </div>
              <h3 className="font-semibold text-foreground">Parallel</h3>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Shows who&apos;s taking the late meetings and early calls. Tracks
              who has adjusted — and how often. Then rotates inconvenient
              meeting times so the cost is shared across the team over time. Not
              perfectly equal — just intentional.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
