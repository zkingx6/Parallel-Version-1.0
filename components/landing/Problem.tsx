"use client";

import {
  Moon,
  Repeat,
  Calendar,
  BarChart3,
  Clock,
  RotateCcw,
} from "lucide-react";
import { Container } from "@/components/ui";
import { cn } from "@/lib/utils";

const problems = [
  {
    icon: Moon,
    title: "Someone always takes the late meeting",
    description:
      "When teams span continents, one person often joins at 10pm so everyone else can meet during the day.",
  },
  {
    icon: Repeat,
    title: "The same teammate keeps adjusting",
    description:
      "Teams choose the time that works for most people — but over months, the same person often sacrifices every week.",
  },
  {
    icon: Calendar,
    title: "Scheduling tools don't track fairness",
    description:
      "Tools like Calendly help find a time, but they don't track who has already taken the burden.",
  },
  {
    icon: BarChart3,
    title: "Managers want fairness but lack visibility",
    description:
      "Leaders care about sharing inconvenience, but there is rarely a clear way to see who has already adjusted.",
  },
  {
    icon: Clock,
    title: "Teams default to \"whatever works\"",
    description:
      "The easiest time gets picked again and again, even if it quietly disadvantages the same region.",
  },
  {
    icon: RotateCcw,
    title: "Manual rotation doesn't scale",
    description:
      "Trying to rotate meeting times across multiple time zones quickly becomes confusing and inconsistent.",
  },
];

export function Problem() {
  return (
    <section
      id="problem"
      className="scroll-mt-24 pt-24 pb-16 md:pt-24 md:pb-20 bg-background"
    >
      <Container>
        <div className="text-center mb-16 md:mb-20">
          <p className="section-label">
            The problem
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-[2.5rem]">
            Global meetings create invisible unfairness
          </h2>
          <p className="mt-5 max-w-2xl mx-auto text-muted-foreground text-lg leading-relaxed">
            Across time zones, someone always takes the early morning or
            late-night call. Over time, it's usually the same teammate.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {problems.map((item) => (
            <div
              key={item.title}
              className={cn(
                "group relative rounded-xl border-2 bg-card p-6 md:p-7",
                "border-[#e0dfde] shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
                "transition-all duration-200 ease-out",
                "hover:border-primary/55 hover:shadow-[0_10px_32px_-8px_rgba(13,148,136,0.2)]",
                "hover:-translate-y-1"
              )}
            >
              <div
                className={cn(
                  "rounded-lg bg-primary/5 border border-primary/10 p-2.5 w-fit mb-4",
                "transition-all duration-200 ease-out",
                "group-hover:bg-primary/12 group-hover:border-primary/25"
                )}
              >
                <item.icon className="size-4 text-primary transition-transform duration-200 group-hover:scale-[1.05]" strokeWidth={1.75} />
              </div>
              <h3 className="font-semibold text-[#1c1b1a] text-[15px] leading-snug">
                {item.title}
              </h3>
              <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
