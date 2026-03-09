"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui";
import { cn } from "@/lib/utils";

const starterFeatures = [
  "Up to 5 team members",
  "Generate rotations up to 4 weeks",
  "Individual meeting limits",
  "IANA timezone support",
  "Export rotations to calendar",
];

const proFeatures = [
  "Up to 20 team members",
  "Generate rotations up to 12 weeks",
  "Everything in Starter",
  "Rotation history tracking",
  "Conflict visibility tools",
  "Priority support",
];

const enterpriseFeatures = [
  "Unlimited team members",
  "Unlimited rotation planning",
  "Advanced scheduling controls",
  "API access",
  "Dedicated support",
  "Enterprise security",
];

const tiers = [
  {
    name: "Starter",
    description: "For small distributed teams",
    price: "$8",
    period: "/member/month",
    trial: "14-day free trial",
    features: starterFeatures,
    cta: "Start free trial",
    ctaSubtext: "No credit card required",
    ctaVariant: "secondary" as const,
    highlighted: false,
  },
  {
    name: "Pro",
    description: "For growing teams",
    price: "$12",
    period: "/member/month",
    trial: null,
    features: proFeatures,
    cta: "Upgrade to Pro",
    ctaSubtext: null,
    ctaVariant: "primary" as const,
    highlighted: true,
  },
  {
    name: "Enterprise",
    description: "For large organizations",
    price: "Custom",
    period: "",
    trial: null,
    features: enterpriseFeatures,
    cta: "Contact sales",
    ctaSubtext: null,
    ctaVariant: "secondary" as const,
    highlighted: false,
  },
];

export function PricingPreview() {
  return (
    <section id="pricing" className="scroll-mt-24 py-24 md:py-32 bg-background">
      <Container>
        <div className="text-center mb-16">
          <p className="section-label">Pricing</p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-muted-foreground">
            Start with a free trial. Scale as your team grows.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "relative rounded-xl border p-6 md:p-8 flex flex-col transition-all duration-200",
                tier.highlighted
                  ? "border-primary/40 bg-primary/5 shadow-[0_4px_24px_-8px_rgba(13,148,136,0.15)] hover:shadow-[0_8px_32px_-8px_rgba(13,148,136,0.2)] hover:border-primary/50"
                  : "border-border bg-card hover:shadow-md hover:border-primary/20"
              )}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                  Most popular
                </span>
              )}
              <h3 className="font-semibold text-foreground">{tier.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {tier.description}
              </p>
              <div className="mt-6 flex flex-wrap items-baseline gap-1">
                <span className="text-3xl font-semibold text-foreground">
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="text-muted-foreground">{tier.period}</span>
                )}
              </div>
              {tier.trial && (
                <p className="mt-2 text-sm text-primary font-medium">
                  {tier.trial}
                </p>
              )}
              <ul className="mt-6 space-y-3 flex-1">
                {tier.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="size-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  href="#"
                  className={cn(
                    "flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
                    tier.ctaVariant === "primary"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md"
                      : "border border-border bg-card text-foreground hover:bg-accent hover:border-primary/30"
                  )}
                >
                  {tier.cta}
                </Link>
                {tier.ctaSubtext && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    {tier.ctaSubtext}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
