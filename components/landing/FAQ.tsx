"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Container } from "@/components/ui";
import { cn } from "@/lib/utils";

const highlight = (text: string) => (
  <span className="text-[#0d9488] font-semibold">{text}</span>
);

const faqs = [
  {
    question: "How does Parallel differ from Calendly or Doodle?",
    answer: (
      <>
        Calendly and Doodle help teams find a time that works <strong>once</strong>. Parallel focuses on{" "}
        {highlight("recurring meetings across global time zones")}.
        <br /><br />
        Instead of always picking the same &quot;least bad&quot; meeting time, Parallel makes scheduling burden visible and{" "}
        {highlight("rotates inconvenient meeting times across weeks")} so the cost is shared across the team.
        <br /><br />
        The goal isn&apos;t perfect equality — it&apos;s {highlight("intentional fairness over time")}.
      </>
    ),
  },
  {
    question: "Who should use Parallel?",
    answer: (
      <>
        Parallel is built for {highlight("distributed teams")} with {highlight("recurring meetings")}.
        <br /><br />
        Common use cases include:
        <br />• <strong>Weekly standups</strong>
        <br />• {highlight("Cross-time-zone team syncs")}
        <br />• <strong>Leadership or project reviews</strong>
        <br /><br />
        If the same people often end up joining very early or very late meetings, Parallel helps teams{" "}
        {highlight("share that burden fairly over time")}.
      </>
    ),
  },
  {
    question: "Does Parallel guarantee equal meeting times for everyone?",
    answer: (
      <>
        No. Parallel doesn&apos;t promise {highlight("mathematically equal meeting times")}.
        <br /><br />
        Every team has different {highlight("time zones")}, working hours, and constraints.
        <br /><br />
        Instead, Parallel helps teams avoid the same person always taking the early morning or late night meeting by{" "}
        {highlight("rotating inconvenience across the schedule whenever possible")}.
      </>
    ),
  },
  {
    question: "Why not just pick the \"best time\" every week?",
    answer: (
      <>
        Because the {highlight("\"best time\"")} often means the same people sacrifice every week.
        <br /><br />
        Parallel helps teams {highlight("rotate inconvenient meeting times")} so no one is always stuck with the worst slot.
      </>
    ),
  },
  {
    question: "What time zones does Parallel support?",
    answer: (
      <>
        Parallel supports all {highlight("IANA time zones")}, such as <strong>America/New_York</strong>,{" "}
        <strong>Europe/London</strong>, and <strong>Asia/Shanghai</strong>.
        <br /><br />
        Using {highlight("IANA time zones")} ensures accurate local time calculations for {highlight("distributed teams")} around the world.
      </>
    ),
  },
  {
    question: "Can I use Parallel with my existing calendar?",
    answer: (
      <>
        Yes — integrations are intentionally simple right now.
        <br /><br />
        Parallel supports schedule export through a {highlight("shareable link")} and {highlight("ICS calendar files")}.
        <br /><br />
        This allows teams to import schedules into {highlight("Google Calendar")}, {highlight("Outlook")}, or other calendar tools.
        <br /><br />
        Deeper integrations may come later.
      </>
    ),
  },
  {
    question: "Is there a free trial?",
    answer: (
      <>
        Yes. Parallel offers a {highlight("14-day free trial")} for the {highlight("Starter plan")} so teams can try scheduling rotations with real meetings.
        <br /><br />
        You can explore how {highlight("fair meeting rotation")} works across {highlight("time zones")} before deciding to upgrade.
      </>
    ),
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 py-24 md:py-32 bg-accent">
      <Container size="narrow">
        <div className="text-center mb-12">
          <p className="section-label">FAQ</p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div
              key={faq.question}
              className="rounded-lg border border-border overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200"
            >
              <button
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left bg-white hover:bg-white transition-colors duration-200"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                aria-expanded={openIndex === i}
              >
                <span className="font-medium text-foreground">{faq.question}</span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    openIndex === i && "rotate-180"
                  )}
                />
              </button>
              {openIndex === i && (
                <div className="border-t border-white bg-white px-5 py-4">
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
