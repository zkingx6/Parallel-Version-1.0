"use client";

import { ShieldCheck, BarChart3 } from "lucide-react";
import { Container } from "@/components/ui";
import { cn } from "@/lib/utils";

const conceptCards = [
  {
    icon: ShieldCheck,
    title: "Hard boundaries",
    description:
      "Hard boundaries define times someone cannot attend at all — like sleep, school pickup, or other non-negotiable limits. Parallel never schedules meetings inside these ranges.",
  },
  {
    icon: BarChart3,
    title: "Burden",
    description:
      "Burden measures how inconvenient a meeting time is. Early mornings and late evenings add more burden. Parallel rotates and distributes that burden across the team over time.",
  },
];

export function NoPerfectTime() {
  return (
    <section
      id="no-perfect-time"
      className="scroll-mt-24 py-24 md:py-32 bg-background"
    >
      <Container>
        <div className="text-center mb-12 md:mb-16">
          <p className="section-label">The reality</p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            There is no perfect meeting time
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground text-lg leading-relaxed">
            Parallel doesn&apos;t try to find a perfect time. It finds the fairest
            rotation when no perfect time exists.
          </p>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
            Across enough time zones, someone joins early or someone stays late.
            Parallel makes that tradeoff more transparent and more fairly shared.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {conceptCards.map((item) => (
            <div
              key={item.title}
              className={cn(
                "group relative rounded-xl border-2 border-border/60 bg-card p-6 lg:p-7 shadow-sm",
                "shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
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
                <item.icon className="size-4 text-primary" strokeWidth={1.75} />
              </div>
              <h3 className="font-semibold text-foreground text-[15px] leading-snug">
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
