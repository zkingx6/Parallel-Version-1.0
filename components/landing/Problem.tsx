"use client";

import {
  PhoneCall,
  CalendarDays,
  Clock,
  Moon,
  RefreshCw,
  Eye,
  Repeat,
  BarChart3,
  Shuffle,
} from "lucide-react";
import { motion } from "motion/react";
import { Container } from "@/components/ui";
import { cn } from "@/lib/utils";

const cities = [
  {
    name: "New York",
    flag: "🇺🇸",
    time: "9:00 AM",
    offset: "UTC-5",
    isBurden: false,
  },
  {
    name: "London",
    flag: "🇬🇧",
    time: "2:00 PM",
    offset: "UTC+0",
    isBurden: false,
  },
  {
    name: "Tokyo",
    flag: "🇯🇵",
    time: "11:00 PM",
    offset: "UTC+9",
    isBurden: true,
  },
];

const weeks = [
  { label: "Week 1", times: ["9:00 AM", "2:00 PM", "11:00 PM"] },
  { label: "Week 2", times: ["9:00 AM", "2:00 PM", "11:00 PM"] },
  { label: "Week 3", times: ["9:00 AM", "2:00 PM", "11:00 PM"] },
  { label: "Week 4", times: ["9:00 AM", "2:00 PM", "11:00 PM"] },
];

const explanationCards = [
  {
    headerIcon: PhoneCall,
    headerLabel: "Meeting burden",
    items: [
      {
        icon: Moon,
        iconColor: "text-destructive",
        title: "Someone always takes the late meeting",
        desc: "When teams span continents, one person often joins at 10pm so everyone else can meet during the day.",
      },
      {
        icon: Repeat,
        iconColor: "text-destructive",
        title: "The same teammate keeps adjusting",
        desc: "Teams choose the time that works for most people — but over months, the same person often sacrifices every week.",
      },
    ],
  },
  {
    headerIcon: CalendarDays,
    headerLabel: "Tool gaps",
    items: [
      {
        icon: BarChart3,
        iconColor: "text-amber-600",
        title: "Scheduling tools don't track fairness",
        desc: "Tools like Calendly help find a time, but they don't track who has already taken the burden.",
      },
      {
        icon: Eye,
        iconColor: "text-amber-600",
        title: "Managers want fairness but lack visibility",
        desc: "Leaders care about sharing inconvenience, but there is rarely a clear way to see who has already adjusted.",
      },
    ],
  },
  {
    headerIcon: Clock,
    headerLabel: "Default behavior",
    items: [
      {
        icon: RefreshCw,
        iconColor: "text-violet-600",
        title: 'Teams default to "whatever works"',
        desc: "The easiest time gets picked again and again, even if it quietly disadvantages the same region.",
      },
      {
        icon: Shuffle,
        iconColor: "text-violet-600",
        title: "Manual rotation doesn't scale",
        desc: "Trying to rotate meeting times across multiple time zones quickly becomes confusing and inconsistent.",
      },
    ],
  },
];

function ClockIcon({ comfortable }: { comfortable: boolean }) {
  return (
    <svg
      className={cn("size-5 shrink-0", comfortable ? "text-primary" : "text-destructive")}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6l4 2"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className="size-5 shrink-0 text-destructive"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );
}

export function Problem() {
  return (
    <section
      id="problem"
      className="scroll-mt-24 pt-24 pb-16 md:pt-24 md:pb-20 bg-card"
    >
      <Container>
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="section-label">The problem</p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-[2.5rem]">
            Global meetings create invisible unfairness
          </h2>
          <p className="mt-5 max-w-2xl mx-auto text-muted-foreground text-lg leading-relaxed">
            Across time zones, someone always takes the early morning or
            late-night call. Over time, it&apos;s usually the same teammate.
          </p>
        </motion.div>

        {/* Explanation cards — appear first */}
        <div className="mb-16 md:mb-20 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {explanationCards.map((card, cardIndex) => {
            const HeaderIcon = card.headerIcon;
            return (
              <motion.div
                key={card.headerLabel}
                className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 + cardIndex * 0.1 }}
              >
                {/* Card header */}
                <div className="flex items-center gap-2.5 px-6 pt-6 pb-4">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <HeaderIcon size={18} className="text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {card.headerLabel}
                  </span>
                </div>
                {/* Divider */}
                <div className="mx-6 h-px bg-border" />
                {/* Items */}
                <div className="px-6 pt-5 pb-6 space-y-5">
                  {card.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <div key={item.title} className="flex gap-3">
                        <div className="mt-0.5 size-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <ItemIcon size={16} className={cn(item.iconColor)} />
                        </div>
                        <div>
                          <h4 className="text-foreground font-semibold text-[0.9rem] mb-1">
                            {item.title}
                          </h4>
                          <p className="text-muted-foreground text-[0.82rem] leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Visual timezone example — below the cards */}
        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {cities.map((city, i) => (
              <motion.div
                key={city.name}
                className={cn(
                  "rounded-2xl p-4 md:p-5 text-center border shadow-sm",
                  city.isBurden
                    ? "bg-destructive/10 border-destructive/30"
                    : "bg-card border-border"
                )}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
              >
                <div className="text-xl mb-1.5">{city.flag}</div>
                <p className="text-sm font-medium text-foreground">{city.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{city.offset}</p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  {city.isBurden ? <MoonIcon /> : <ClockIcon comfortable />}
                  <span
                    className={cn(
                      "text-base font-medium tracking-tight",
                      city.isBurden ? "text-destructive" : "text-primary"
                    )}
                  >
                    {city.time}
                  </span>
                </div>
                {city.isBurden && (
                  <span className="mt-2.5 inline-flex items-center px-2.5 py-1 rounded-full bg-destructive/20 text-destructive text-xs font-medium">
                    Late night call
                  </span>
                )}
              </motion.div>
            ))}
          </div>

          {/* Burden section title */}
          <motion.p
            className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            Who takes the burden each week?
          </motion.p>

          {/* Week grid */}
          <div className="space-y-2.5">
            {weeks.map((week, i) => (
              <motion.div
                key={week.label}
                className="grid grid-cols-[72px_1fr] sm:grid-cols-[80px_1fr] items-center gap-3"
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.65 + i * 0.06 }}
              >
                <p className="text-right text-sm text-muted-foreground">{week.label}</p>
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  {cities.map((city, i) => {
                    const isBurden = city.isBurden;
                    return (
                      <div
                        key={city.name}
                        className={cn(
                          "rounded-xl py-2.5 px-3 flex items-center justify-between border",
                          isBurden
                            ? "bg-destructive/10 border-destructive/30"
                            : "bg-muted/30 border-border/60"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm shrink-0">{city.flag}</span>
                          <span
                            className={cn(
                              "text-sm truncate",
                              isBurden ? "text-destructive font-medium" : "text-muted-foreground"
                            )}
                          >
                            {week.times[i]}
                          </span>
                        </div>
                        {isBurden && (
                          <span className="size-2 rounded-full bg-destructive shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Summary */}
          <motion.div
            className="mt-8 flex justify-center"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <motion.div
              className="inline-flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 max-w-md"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-xl shrink-0">🇯🇵</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-destructive">
                  Tokyo took the late call <strong>4 out of 4 weeks</strong>
                </p>
                <p className="text-xs text-destructive/80 mt-0.5">
                  The same teammate keeps adjusting — every single time.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
