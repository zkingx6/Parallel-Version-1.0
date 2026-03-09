"use client";

import { useState } from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { Eye, BarChart3, RefreshCw, Sparkles } from "lucide-react";
import { Container } from "@/components/ui";

const solutionCards = [
  {
    icon: Eye,
    title: "See who adjusts",
    description:
      "See who has taken the inconvenient slot and how often. Parallel surfaces hidden patterns — so your team can make informed decisions.",
    bgLight: "bg-primary/10",
  },
  {
    icon: BarChart3,
    title: "Track over time",
    description:
      "Track who takes late meetings and early calls — so it's visible, not hidden. A running fairness ledger for every teammate, updated automatically.",
    bgLight: "bg-primary/10",
    featured: true,
  },
  {
    icon: RefreshCw,
    title: "Intentional rotation",
    description:
      "Rotate inconvenient meeting times so the cost is shared across the team over time. Not random, not manual — intentional and fair.",
    bgLight: "bg-primary/10",
  },
];

function SolutionCard({
  card,
  index,
}: {
  card: (typeof solutionCards)[0];
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
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.15 + index * 0.12 }}
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
          className={`relative bg-card rounded-2xl p-7 h-full flex flex-col overflow-hidden ${
            card.featured
              ? "border-2 border-primary/30 shadow-[0_2px_12px_rgba(13,148,136,0.08)]"
              : "border border-border shadow-sm"
          }`}
          animate={{
            borderColor: isHovered
              ? card.featured
                ? "#0d9488"
                : "#b2dfdb"
              : card.featured
              ? "#b2dfdb"
              : "#e8e8e8",
            boxShadow: isHovered
              ? "0 12px 40px rgba(13, 148, 136, 0.12)"
              : card.featured
              ? "0 2px 12px rgba(13, 148, 136, 0.08)"
              : "0 1px 4px rgba(0, 0, 0, 0.04)",
          }}
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Hover gradient overlay */}
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none bg-primary/5"
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Floating particles on hover */}
          {isHovered && (
            <>
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-primary"
                  initial={{
                    opacity: 0,
                    x: 30 + i * 60,
                    y: 120,
                  }}
                  animate={{
                    opacity: [0, 0.4, 0],
                    y: [120, 40 + i * 15],
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

          {/* Icon */}
          <motion.div
            className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 relative ${card.bgLight}`}
            animate={{ scale: isHovered ? 1.1 : 1 }}
            transition={{ duration: 0.4 }}
          >
            <Icon size={20} className="text-primary" />
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

          <h3 className="text-foreground text-[1.02rem] mb-2.5 relative font-semibold">
            {card.title}
          </h3>

          <p className="text-muted-foreground text-[0.88rem] leading-relaxed relative flex-1">
            {card.description}
          </p>

          {/* Bottom accent line */}
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

export function ParallelSolution() {
  return (
    <section
      id="solution"
      className="scroll-mt-24 py-24 md:py-32 bg-muted/30 relative"
    >
      {/* Subtle top border gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <Container>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="flex items-center justify-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-primary"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <Sparkles size={14} className="shrink-0" />
              <span>The solution</span>
            </motion.div>

            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-[2.25rem] mb-5 max-w-2xl mx-auto leading-[1.15] mt-4">
              The missing layer for recurring meetings
            </h2>

            <p className="text-muted-foreground max-w-xl mx-auto text-[1.02rem] leading-relaxed">
              Parallel adds visibility and rotation to recurring scheduling.
              Define your team, set availability, and let Parallel generate a
              rotation that spreads the cost across the team over time.
            </p>
          </motion.div>

          {/* Solution Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {solutionCards.map((card, i) => (
              <SolutionCard key={card.title} card={card} index={i} />
            ))}
          </div>

          {/* Connecting line between cards (desktop only) */}
          <motion.div
            className="hidden md:flex items-center justify-center mt-8 gap-2"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div key={i} className="flex items-center gap-2">
                <motion.div
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0.7, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.4,
                    repeat: Infinity,
                  }}
                />
                {i < 2 && (
                  <motion.div
                    className="w-24 h-px bg-primary/30"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.9 + i * 0.2, duration: 0.5 }}
                  />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
