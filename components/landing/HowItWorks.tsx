"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Users, CalendarClock, Shuffle, Send } from "lucide-react";

const steps = [
  {
    number: 1,
    icon: Users,
    title: "Create your team",
    description:
      "Invite teammates and set up your workspace. Only the owner needs to start the plan.",
  },
  {
    number: 2,
    icon: CalendarClock,
    title: "Define meeting rules",
    description:
      "Add meeting cadence, time zones, availability windows, and hard boundaries.",
  },
  {
    number: 3,
    icon: Shuffle,
    title: "Generate a rotation",
    description:
      "Parallel computes a meeting schedule that distributes inconvenient times across the team over time.",
  },
  {
    number: 4,
    icon: Send,
    title: "Review and publish",
    description:
      "See who adjusts, understand the reasoning, and publish the final schedule with transparency.",
  },
];

function StepCard({
  step,
  index,
}: {
  step: (typeof steps)[0];
  index: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = step.icon;

  return (
    <motion.div
      className="relative flex flex-col"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: 0.1 + index * 0.1 }}
    >
      {/* Connector line (between cards, desktop only) */}
      {index < steps.length - 1 && (
        <motion.div
          className="hidden md:block absolute top-[22px] left-[calc(50%+28px)] w-[calc(100%-56px)] right-0 z-0"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35 + index * 0.12, duration: 0.5 }}
          style={{ transformOrigin: "left" }}
        >
          <div className="w-full border-t-2 border-dashed border-[#d1d5db]" />
        </motion.div>
      )}

      {/* Number badge + Icon row */}
      <div className="flex items-center gap-3 mb-5 relative z-10">
        <motion.div
          className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-white text-sm shrink-0"
          style={{ fontWeight: 600, backgroundColor: "#0d9488" }}
          animate={{
            scale: isHovered ? 1.1 : 1,
            boxShadow: isHovered
              ? "0 0 0 6px rgba(13, 148, 136, 0.12)"
              : "0 0 0 0px rgba(13, 148, 136, 0)",
          }}
          transition={{ duration: 0.3 }}
        >
          {step.number}
        </motion.div>
        <motion.div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          animate={{
            backgroundColor: isHovered ? "#ccfbf1" : "#f0fdfa",
          }}
          transition={{ duration: 0.3 }}
        >
          <Icon size={18} className="text-[#0d9488]" />
        </motion.div>
      </div>

      {/* Card body */}
      <motion.div
        className="bg-white rounded-2xl p-6 flex-1 border border-[#e8e8e8] shadow-[0_1px_4px_rgba(0,0,0,0.04)] cursor-default"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{
          borderColor: isHovered ? "#b2dfdb" : "#e8e8e8",
          boxShadow: isHovered
            ? "0 8px 30px rgba(13, 148, 136, 0.08)"
            : "0 1px 4px rgba(0, 0, 0, 0.04)",
          y: isHovered ? -4 : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        <h3
          className="text-[#1a1a2e] text-[1.02rem] mb-2"
          style={{ fontWeight: 600 }}
        >
          {step.title}
        </h3>
        <p className="text-[#6b7280] text-[0.88rem] leading-relaxed">
          {step.description}
        </p>
      </motion.div>
    </motion.div>
  );
}

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 py-24 px-6 bg-[#f8f9fa] relative"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e0e0e0] to-transparent" />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-[#0d9488] text-sm tracking-widest uppercase mb-4 block">
            How It Works
          </span>
          <h2 className="text-[2.25rem] tracking-[-0.03em] text-[#1a1a2e] mb-5 max-w-2xl mx-auto leading-[1.15] mt-4">
            Four steps to intentional rotation
          </h2>
          <p className="text-[#6b7280] max-w-lg mx-auto text-[1.02rem] leading-relaxed">
            Set up once. The algorithm handles the rest.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {steps.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
