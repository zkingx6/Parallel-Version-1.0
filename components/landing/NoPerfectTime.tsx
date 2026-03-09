"use client";

import { useState } from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { ShieldCheck, BarChart3 } from "lucide-react";
import { Container } from "@/components/ui";

const conceptCards = [
  {
    icon: ShieldCheck,
    title: "Hard boundaries",
    description:
      "Hard boundaries define times someone cannot attend at all — like sleep, school pickup, or other non-negotiable limits. Parallel never schedules meetings inside these ranges.",
  },
  {
    icon: BarChart3,
    title: "Burden",
    description:
      "Burden measures how inconvenient a meeting time is. Early mornings and late evenings add more burden. Parallel rotates and distributes that burden across the team over time.",
  },
];

function ConceptCard({
  card,
  index,
}: {
  card: (typeof conceptCards)[0];
  index: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-150, 150], [3, -3]);
  const rotateY = useTransform(mouseX, [-150, 150], [-3, 3]);

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
      transition={{ duration: 0.5, delay: 0.2 + index * 0.15 }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div
          className="relative rounded-2xl border bg-card p-8 h-full flex flex-col overflow-hidden shadow-sm"
          animate={{
            borderColor: isHovered ? "#b2dfdb" : "#e8e8e8",
            boxShadow: isHovered
              ? "0 12px 40px rgba(13, 148, 136, 0.10)"
              : "0 1px 4px rgba(0, 0, 0, 0.04)",
          }}
          transition={{ duration: 0.35 }}
        >
          {/* Hover gradient overlay */}
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background:
                "radial-gradient(circle at 50% 0%, rgba(13, 148, 136, 0.04), transparent 70%)",
            }}
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
                    x: 40 + i * 80,
                    y: 140,
                  }}
                  animate={{
                    opacity: [0, 0.35, 0],
                    y: [140, 50 + i * 15],
                    x: 40 + i * 80 + (i % 2 === 0 ? 10 : -10),
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
            className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 relative bg-primary/10"
            animate={{ scale: isHovered ? 1.08 : 1 }}
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

          {/* Title */}
          <h3 className="text-[1.05rem] font-semibold text-foreground mb-3 relative">
            {card.title}
          </h3>

          {/* Description */}
          <p className="text-[0.88rem] leading-relaxed text-muted-foreground flex-1 relative">
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

export function NoPerfectTime() {
  return (
    <section
      id="no-perfect-time"
      className="scroll-mt-24 py-24 md:py-32 bg-white relative"
    >
      {/* Subtle top border gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <Container>
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.span
            className="section-label block mb-4"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            The reality
          </motion.span>

          <h2 className="text-[2.25rem] tracking-[-0.03em] font-semibold text-foreground mb-6 max-w-2xl mx-auto leading-[1.15] mt-4">
            There is no perfect meeting time
          </h2>

          <motion.p
            className="text-muted-foreground max-w-xl mx-auto text-[1.02rem] leading-relaxed mb-4"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            Parallel doesn&apos;t try to find a perfect time. It finds the fairest
            rotation when no perfect time exists.
          </motion.p>

          <motion.p
            className="text-muted-foreground max-w-xl mx-auto text-[0.95rem] leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            Across enough time zones, someone joins early or someone stays late.
            Parallel makes that tradeoff more transparent and more fairly shared.
          </motion.p>
        </motion.div>

        {/* Concept Cards — 2 column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {conceptCards.map((card, i) => (
            <ConceptCard key={card.title} card={card} index={i} />
          ))}
        </div>
      </Container>
    </section>
  );
}
