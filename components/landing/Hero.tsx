"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Globe, Clock, Users, Repeat } from "lucide-react";
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
                className="inline-flex items-center gap-2 bg-white text-emerald-600 border border-emerald-200 px-7 py-3 rounded-full text-[0.92rem] cursor-pointer transition-colors duration-200 hover:border-emerald-400 hover:bg-emerald-50"
                style={{ fontWeight: 500 }}
                whileHover={{
                  borderColor: "#34d399",
                  backgroundColor: "#ecfdf5",
                  gap: "10px",
                }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.25 }}
              >
                Start free
                <ArrowRight size={16} />
              </motion.span>
            </Link>

            <Link href="#pricing">
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
            </Link>
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

        {/* Demo preview — unchanged */}
        <div className="relative z-20 mx-auto w-full max-w-5xl px-5 sm:px-6 lg:px-8 mt-16 md:mt-24">
          <p className="text-center text-sm text-muted-foreground mb-4">
            No perfect meeting time exists for this team. Parallel distributes
            the inconvenience more fairly across the cycle.
          </p>
          <DemoSandbox />
        </div>
      </div>
    </section>
  );
}
