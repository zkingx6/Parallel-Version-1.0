"use client";

import { Eye, BarChart3, RefreshCw } from "lucide-react";
import { Container } from "@/components/ui";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Eye,
    title: "See who adjusts",
    description: "See who has taken the inconvenient slot and how often.",
  },
  {
    icon: BarChart3,
    title: "Track over time",
    description: "Track who takes late meetings and early calls—so it's visible, not hidden.",
  },
  {
    icon: RefreshCw,
    title: "Intentional rotation",
    description: "Rotate inconvenient meeting times so the cost is shared across the team.",
  },
];

export function ParallelSolution() {
  return (
    <section id="solution" className="scroll-mt-24 py-24 md:py-32 bg-card">
      <Container>
        <div className="text-center mb-16">
          <p className="section-label">The solution</p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            The missing layer for recurring meetings
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
            Parallel adds visibility and rotation to recurring scheduling.
            Define your team, set availability, and let Parallel generate a
            rotation that spreads the cost across the team over time.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {features.map((item) => (
            <div
              key={item.title}
              className={cn(
                "group relative rounded-xl border-2 border-border/60 bg-card p-6 lg:p-8 shadow-sm",
                "shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
                "transition-all duration-200 ease-out",
                "hover:border-primary/55 hover:shadow-[0_10px_32px_-8px_rgba(13,148,136,0.2)]",
                "hover:-translate-y-1"
              )}
            >
              <div
                className={cn(
                  "rounded-lg bg-primary/5 border border-primary/10 p-3 w-fit mb-4",
                "transition-all duration-200 ease-out",
                "group-hover:bg-primary/12 group-hover:border-primary/25"
                )}
              >
                <item.icon className="size-5 text-primary transition-transform duration-200 group-hover:scale-[1.05]" />
              </div>
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
