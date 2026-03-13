"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { scrollToSection } from "@/lib/utils";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { ArrowRight, Globe, Clock, Users, Repeat, Zap, RotateCw, MessageSquare } from "lucide-react";
import { DemoSandbox } from "@/components/demo";

const rotatingWords = ["late meetings", "early calls", "weekly syncs"];

const floatingPills = [
  { label: "Shanghai 🇨🇳", time: "2:00 AM", side: "left" as const, x: "8%", y: "12%", delay: 0 },
  { label: "Berlin 🇩🇪", time: "7:00 PM", side: "left" as const, x: "14%", y: "45%", delay: 1.2 },
  { label: "New York 🇺🇸", time: "1:00 PM", side: "left" as const, x: "6%", y: "72%", delay: 1.6 },
  { label: "London 🇬🇧", time: "6:00 PM", side: "right" as const, x: "8%", y: "12%", delay: 0.8 },
  { label: "São Paulo 🇧🇷", time: "2:00 PM", side: "right" as const, x: "14%", y: "45%", delay: 2.0 },
  { label: "Sydney 🇦🇺", time: "5:00 AM", side: "right" as const, x: "6%", y: "72%", delay: 0.4 },
];

function RotatingWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 2600);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-flex justify-center min-w-[160px]">
      <AnimatePresence mode="wait">
        <motion.span
          key={rotatingWords[index]}
          className="inline-block bg-[#0d9488]/10 text-[#0d9488] px-3 py-0.5 rounded-lg border border-[#0d9488]/20"
          style={{ fontWeight: 500 }}
          initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -14, filter: "blur(4px)" }}
          transition={{ duration: 0.35 }}
        >
          {rotatingWords[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function FloatingPill({ pill }: { pill: (typeof floatingPills)[0] }) {
  const position =
    pill.side === "left"
      ? { left: pill.x, top: pill.y }
      : { right: pill.x, left: "auto", top: pill.y };
  return (
    <motion.div
      className="absolute hidden lg:flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-[#e8e8e8] shadow-[0_2px_8px_rgba(0,0,0,0.04)] select-none pointer-events-none"
      style={position}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: [0, 0.75, 0.75, 0.75],
        scale: [0.8, 1, 1, 1],
        y: [0, -6, 0, 6, 0],
      }}
      transition={{
        opacity: { delay: pill.delay + 0.5, duration: 1.2 },
        scale: { delay: pill.delay + 0.5, duration: 0.8 },
        y: {
          delay: pill.delay + 1.5,
          duration: 5 + Math.random() * 2,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }}
    >
      <span className="text-[0.72rem] text-[#6b7280]">{pill.label}</span>
      <span
        className="text-[0.68rem] text-[#0d9488] bg-[#f0fdfa] px-1.5 py-0.5 rounded-md"
        style={{ fontWeight: 500 }}
      >
        {pill.time}
      </span>
    </motion.div>
  );
}

const whyTeamsCards = [
  {
    icon: Zap,
    title: "10× faster scheduling",
    description:
      "Stop manual time-zone math. Parallel analyzes everyone's availability instantly.",
  },
  {
    icon: MessageSquare,
    title: "Generate weeks of meetings in seconds",
    description:
      "Instead of endless Slack messages or polls, Parallel creates a fair multi-week schedule in one click.",
  },
  {
    icon: RotateCw,
    title: "Fair rotation built in",
    description:
      "No one gets stuck with early mornings or late nights forever. Parallel rotates the inconvenience automatically.",
  },
];

function WhyTeamsCard({
  card,
  index,
}: {
  card: (typeof whyTeamsCards)[0];
  index: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-150, 150], [4, -4]);
  const rotateY = useTransform(mouseX, [-150, 150], [-4, 4]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  const Icon = card.icon;

  return (
    <motion.div
      className="relative h-full"
      style={{ perspective: 800 }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div
          className="relative bg-card rounded-2xl p-6 h-full flex flex-col overflow-hidden border border-border shadow-sm"
          animate={{
            borderColor: isHovered ? "#b2dfdb" : "#e8e8e8",
            boxShadow: isHovered
              ? "0 12px 40px rgba(13, 148, 136, 0.12)"
              : "0 1px 4px rgba(0, 0, 0, 0.04)",
          }}
          style={{ backfaceVisibility: "hidden" }}
        >
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none bg-primary/5"
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
          {isHovered && (
            <>
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-primary"
                  initial={{ opacity: 0, x: 30 + i * 60, y: 100 }}
                  animate={{
                    opacity: [0, 0.4, 0],
                    y: [100, 30 + i * 15],
                    x: 30 + i * 60 + (i % 2 === 0 ? 10 : -10),
                  }}
                  transition={{
                    duration: 1.8,
                    delay: i * 0.3,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                />
              ))}
            </>
          )}
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 relative bg-primary/10"
            animate={{ scale: isHovered ? 1.1 : 1 }}
            transition={{ duration: 0.4 }}
          >
            <Icon size={18} className="text-primary" />
            {isHovered && (
              <motion.div
                className="absolute inset-0 rounded-xl border-2 border-primary"
                initial={{ opacity: 0, scale: 1 }}
                animate={{
                  opacity: [0, 0.3, 0],
                  scale: [1, 1.4],
                }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            )}
          </motion.div>
          <h3 className="text-foreground text-[0.95rem] mb-2 relative font-semibold">
            {card.title}
          </h3>
          <p className="text-muted-foreground text-[0.82rem] leading-relaxed relative flex-1">
            {card.description}
          </p>
          <motion.div
            className="absolute bottom-0 left-1/2 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
            animate={{
              width: isHovered ? "80%" : "0%",
              marginLeft: isHovered ? "-40%" : "0%",
            }}
            transition={{ duration: 0.4 }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function WhyTeamsSection() {
  return (
    <div className="mt-16 md:mt-20">
      <h3 className="text-center text-[0.9rem] font-semibold text-[#1a1a2e] mb-6">
        Why teams use Parallel
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
        {whyTeamsCards.map((card, i) => (
          <WhyTeamsCard key={card.title} card={card} index={i} />
        ))}
      </div>
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  delay,
}: {
  icon: typeof Globe;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 border border-[#e8e8e8] shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-[0.78rem] text-[#6b7280]"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      <Icon size={13} className="text-[#0d9488]" />
      <span>{label}</span>
    </motion.div>
  );
}

export function Hero() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left - rect.width / 2) / rect.width,
      y: (e.clientY - rect.top - rect.height / 2) / rect.height,
    });
  }, []);

  return (
    <section
      className="relative overflow-hidden pt-8 pb-24 md:pb-32 bg-background"
      onMouseMove={handleMouseMove}
    >
      {/* Dot grid background */}
      <div
        className="absolute inset-0 opacity-[0.35] z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Radial glow that follows cursor subtly */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(circle, rgba(13,148,136,0.06) 0%, transparent 70%)",
          left: "50%",
          top: "50%",
        }}
        animate={{
          x: `calc(-50% + ${mousePos.x * 40}px)`,
          y: `calc(-50% + ${mousePos.y * 40}px)`,
        }}
        transition={{ type: "spring", stiffness: 50, damping: 30 }}
      />

      <div className="relative z-10 pt-20 md:pt-24">
        {/* Hero headline wrapper — pills positioned relative to this, not full page */}
        <div className="relative">
          {/* Floating timezone pills — surround headline only */}
          {floatingPills.map((pill) => (
            <FloatingPill key={pill.label} pill={pill} />
          ))}

          {/* Hero content */}
          <div className="relative z-10 mx-auto max-w-4xl flex flex-col items-center justify-center text-center px-5 sm:px-6 lg:px-8">
          {/* Top badge */}
          <motion.div
            className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 border border-[#e8e8e8] shadow-[0_1px_4px_rgba(0,0,0,0.04)] mb-8"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.span
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Globe size={15} className="text-[#0d9488]" />
            </motion.span>
            <span className="text-[0.82rem] text-[#6b7280]">
              For teams that care about each other&apos;s time
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            className="text-[2.85rem] md:text-[3.5rem] tracking-[-0.04em] text-[#1a1a2e] mb-6 leading-[1.1] text-center"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            Fairer meeting times
            <br />
            for{" "}
            <span className="relative">
              <span className="text-[#0d9488]">global teams</span>
              <motion.span
                className="absolute -bottom-1 left-0 right-0 h-[3px] bg-[#0d9488]/25 rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                style={{ transformOrigin: "left" }}
              />
            </span>
          </motion.h1>

          {/* Rotating word line */}
          <motion.p
            className="w-full text-[1.1rem] text-[#6b7280] mb-4 flex items-center justify-center gap-2 flex-wrap"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          >
            Parallel helps teams rotate <RotatingWord />
          </motion.p>

          {/* Subtext */}
          <motion.p
            className="text-[#9ca3af] text-[0.95rem] max-w-md mx-auto leading-relaxed mb-10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            Across time zones, someone always takes the late meeting or the early
            morning call. Parallel rotates who adjusts — not perfectly equal, but
            shared more intentionally over time.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex items-center justify-center gap-3 mb-10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
          >
            <Link href="/signup">
              <motion.span
                className="inline-flex items-center gap-2 bg-chart-1 text-white border-0 px-7 py-3 rounded-full text-[0.92rem] cursor-pointer transition-colors duration-200 hover:opacity-90"
                style={{ fontWeight: 500, backgroundColor: "var(--chart-1)" }}
                whileHover={{
                  gap: "10px",
                }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.25 }}
              >
                Start free
                <ArrowRight size={16} />
              </motion.span>
            </Link>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection("pricing")
              }}
            >
              <motion.span
                className="inline-flex items-center justify-center bg-white text-emerald-600 border border-emerald-200 px-6 py-3 rounded-full text-[0.92rem] cursor-pointer transition-colors duration-200 hover:border-emerald-400 hover:bg-emerald-50"
                style={{ fontWeight: 500 }}
                whileHover={{
                  borderColor: "#34d399",
                  backgroundColor: "#ecfdf5",
                }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.25 }}
              >
                See pricing
              </motion.span>
            </button>
          </motion.div>

          {/* Stat chips row */}
          <motion.div
            className="flex items-center justify-center gap-3 flex-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            <StatChip
              icon={Users}
              label="Built for distributed teams"
              delay={1.1}
            />
            <StatChip
              icon={Clock}
              label="Supports all IANA timezones"
              delay={1.25}
            />
            <StatChip
              icon={Repeat}
              label="Auto-rotation every cycle"
              delay={1.4}
            />
          </motion.div>
        </div>
        </div>

        {/* Demo preview */}
        <div className="relative z-20 mx-auto w-full max-w-5xl px-5 sm:px-6 lg:px-8 mt-16 md:mt-24">
          <DemoSandbox />

          {/* Explanation block — below demo */}
          <div className="text-center mt-10 space-y-2 max-w-2xl mx-auto">
            <p className="text-sm text-muted-foreground">
              There is rarely a perfect meeting time across global teams.
            </p>
            <p className="text-sm text-muted-foreground">
              Parallel finds the{" "}
              <span className="text-[#0d9488] font-medium">best possible schedule</span>{" "}
              across{" "}
              <span className="text-[#0d9488]/90">time zones, working hours, and hard constraints</span>.
            </p>
            <p className="text-sm text-muted-foreground">
              When a perfect split isn&apos;t possible, Parallel{" "}
              <span className="text-[#0d9488] font-medium">rotates the burden fairly</span>.
            </p>
          </div>

          {/* Why teams use Parallel — reuses Solution card hover style */}
          <WhyTeamsSection />
        </div>
      </div>
    </section>
  );
}
