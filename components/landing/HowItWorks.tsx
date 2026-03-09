"use client";

import { Users, Calendar, Shuffle, Share2, ChevronRight } from "lucide-react";
import { Container } from "@/components/ui";

const steps = [
  {
    step: 1,
    icon: Users,
    title: "Add your team",
    description:
      "Add members and their time zones. The system uses IANA timezones for accuracy.",
  },
  {
    step: 2,
    icon: Calendar,
    title: "Define availability",
    description:
      "Set meeting preferences, frequency, and acceptable windows. The system captures your constraints.",
  },
  {
    step: 3,
    icon: Shuffle,
    title: "Generate rotation",
    description:
      "The algorithm computes a fair rotation—balancing who takes the late meeting or early call across the team over time.",
  },
  {
    step: 4,
    icon: Share2,
    title: "Share the schedule",
    description:
      "Export or sync the rotation. Everyone sees who adjusts when.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 pt-14 pb-16 md:pt-16 md:pb-20 bg-background"
    >
      <Container>
        <div className="text-center mb-10">
          <p className="section-label">How it works</p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Four steps to intentional rotation
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
            Set up once. The algorithm handles the rest.
          </p>
        </div>

        <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-3">
          {steps.map((item, i) => (
            <div key={item.step} className="flex items-stretch lg:min-w-0">
              <div
                className="relative flex-1 flex flex-col sm:flex-row sm:items-start gap-3 rounded-xl p-4 lg:p-5 border border-[#e0dfde] bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:border-primary/35 hover:shadow-[0_6px_20px_-6px_rgba(13,148,136,0.12)] hover:-translate-y-0.5"
              >
                <span className="flex shrink-0 size-8 rounded-full items-center justify-center text-xs font-semibold bg-primary text-primary-foreground ring-2 ring-primary/15 ring-offset-2">
                  {item.step}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="rounded-lg bg-primary/10 border border-primary/20 p-2 w-fit mb-2">
                    <item.icon className="size-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground text-[15px]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div
                  className="hidden lg:flex shrink-0 items-center justify-center px-1 self-center"
                  aria-hidden
                >
                  <ChevronRight className="size-4 text-primary/20" />
                </div>
              )}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
