"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui";

export function FinalCTA() {
  return (
    <section className="py-24 md:py-32 bg-gradient-to-b from-primary/[0.02] via-primary/5 to-primary/[0.02] border-y border-border">
      <Container size="narrow">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Ready to rotate who adjusts?
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-muted-foreground">
            Start spreading the cost across your global team. No credit card
            required.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20"
          >
            Start free
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
