"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Container } from "@/components/ui";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "How does Parallel differ from Calendly or Doodle?",
    answer:
      "Calendly and Doodle find when everyone is available. Parallel focuses on recurring meetings: it makes scheduling burden visible and helps you rotate inconvenient meeting times so the cost is shared across the team over time—not perfectly equal, but intentional.",
  },
  {
    question: "Does Parallel guarantee equal meeting times for everyone?",
    answer:
      "No. Parallel does not promise mathematically equal or perfectly fair meeting times. It helps teams make burden visible and distribute it intentionally over time. The goal is to avoid the same person always sacrificing, not to achieve perfect equality.",
  },
  {
    question: "What time zones does Parallel support?",
    answer:
      "Parallel uses IANA time zones (e.g. America/New_York, Europe/London, Asia/Tokyo) as the single source of truth. This ensures accurate local time calculations for all team members.",
  },
  {
    question: "Can I use Parallel with my existing calendar?",
    answer:
      "Yes. Parallel can export rotation schedules so you can sync with Google Calendar, Outlook, or other tools. Integration details depend on your plan.",
  },
  {
    question: "Who should use Parallel?",
    answer:
      "Distributed teams with recurring meetings—standups, syncs, reviews—where the same people often take the inconvenient time. Parallel helps teams share the burden across the team over time.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 py-24 md:py-32 bg-card">
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
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-accent/30 transition-colors duration-200"
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
                <div className="border-t border-border px-5 py-4">
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
