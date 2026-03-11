"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Container } from "@/components/ui";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "How does Parallel differ from Calendly or Doodle?",
    answer:
      "Calendly and Doodle help teams find a time that works for everyone once. Parallel focuses on recurring meetings across time zones. Instead of always picking the same \"least bad\" time, Parallel makes scheduling burden visible and rotates inconvenient meeting times over weeks so the cost is shared across the team. The goal isn't perfect equality — it's intentional fairness over time.",
  },
  {
    question: "Does Parallel guarantee equal meeting times for everyone?",
    answer:
      "No. Parallel doesn't promise mathematically equal meeting times. Every team has different time zones, working hours, and constraints. Instead, Parallel helps teams avoid the same person always taking the early or late meeting by rotating inconvenience across the schedule whenever possible.",
  },
  {
    question: "What time zones does Parallel support?",
    answer:
      "Parallel supports all IANA time zones, such as America/New_York, Europe/London, and Asia/Tokyo. Using IANA time zones helps ensure accurate local time calculations for distributed teams around the world.",
  },
  {
    question: "Can I use Parallel with my existing calendar?",
    answer:
      "Yes — but integrations are intentionally simple right now. Parallel currently supports schedule export through a shareable link and ICS calendar files. That means teams can bring schedules into Google Calendar, Outlook, or other calendar tools using export/import workflows for now. Deeper integrations may come later.",
  },
  {
    question: "Who should use Parallel?",
    answer:
      "Parallel is built for distributed teams with recurring meetings, such as weekly standups, cross-time-zone team syncs, and project or leadership reviews. If the same people often end up joining very early or very late meetings, Parallel helps teams share that burden more fairly over time.",
  },
  {
    question: "Why not just pick the \"best time\" every week?",
    answer:
      "Because the \"best time\" often means the same people sacrifice every week. Parallel helps teams rotate inconvenient meeting times so no one is always stuck with the worst slot.",
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
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
