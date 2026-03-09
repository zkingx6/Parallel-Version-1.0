import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ChevronDown,
  CalendarCheck,
  ShieldCheck,
  RefreshCw,
  Users,
  BarChart3,
  Zap,
} from "lucide-react";

/* ───── Mock data ───── */

interface BurdenEntry {
  initials: string;
  name: string;
  score: number;
  avatarColor: string;
}

const burdenData: BurdenEntry[] = [
  { initials: "Z", name: "Zion", score: 4, avatarColor: "#0d9488" },
  { initials: "EW", name: "Emma Wilson", score: 0, avatarColor: "#6366f1" },
  { initials: "SA", name: "Sara Al-Hassan", score: 0, avatarColor: "#ec4899" },
  { initials: "HM", name: "Hans Mueller", score: 0, avatarColor: "#8b5cf6" },
  { initials: "YT", name: "Yuki Tanaka", score: 5, avatarColor: "#f59e0b" },
];
const maxBurden = Math.max(...burdenData.map((b) => b.score), 1);

interface WeekTime {
  week: number;
  time: string;
  barPercent: number; // 0-100 visual width
  isHeaviest: boolean;
}

const meetingTimes: WeekTime[] = [
  { week: 1, time: "7:00 AM", barPercent: 55, isHeaviest: false },
  { week: 2, time: "7:30 AM", barPercent: 60, isHeaviest: false },
  { week: 3, time: "7:00 AM", barPercent: 55, isHeaviest: false },
  { week: 4, time: "8:00 AM", barPercent: 80, isHeaviest: true },
];

interface SacrificeDot {
  color: string;
  type: "early" | "late" | "mild";
}

interface SacrificeWeek {
  week: number;
  time: string;
  dots: SacrificeDot[];
}

const sacrificeTimeline: SacrificeWeek[] = [
  {
    week: 1,
    time: "7:00 AM",
    dots: [
      { color: "#0d9488", type: "early" },
      { color: "#f59e0b", type: "late" },
    ],
  },
  {
    week: 2,
    time: "7:30 AM",
    dots: [
      { color: "#0d9488", type: "early" },
      { color: "#f59e0b", type: "late" },
    ],
  },
  {
    week: 3,
    time: "7:00 AM",
    dots: [
      { color: "#0d9488", type: "early" },
      { color: "#f59e0b", type: "late" },
    ],
  },
  {
    week: 4,
    time: "8:00 AM",
    dots: [{ color: "#8b5cf6", type: "mild" }],
  },
];

interface TimezoneImpact {
  city: string;
  range: string;
}

const timezoneImpacts: TimezoneImpact[] = [
  { city: "New York", range: "7:00 AM – 8:00 AM" },
  { city: "London", range: "11:00 AM – 1:00 PM" },
  { city: "Dubai", range: "3:00 PM – 4:00 PM" },
  { city: "Berlin", range: "12:00 PM – 2:00 PM" },
  { city: "Tokyo", range: "8:00 PM – 9:00 PM" },
];

const reasonCards = [
  {
    icon: CalendarCheck,
    title: "Availability checked",
    description: "All members' working hours were evaluated.",
  },
  {
    icon: ShieldCheck,
    title: "Hard boundaries respected",
    description: "No meetings were scheduled during blocked time ranges.",
  },
  {
    icon: RefreshCw,
    title: "Rotation generated",
    description:
      "The schedule distributes meeting inconvenience across the cycle.",
  },
];

/* ───── Page ───── */

export function AnalysisPage() {
  const navigate = useNavigate();
  const { scheduleId } = useParams();
  const [tzOpen, setTzOpen] = useState(false);

  const fairnessScore = 48;
  const fairnessLabel = "Poor balance";

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <motion.button
        onClick={() => navigate(`/app/schedule/${scheduleId || "1"}`)}
        className="flex items-center gap-1.5 text-[0.82rem] text-[#9ca3af] hover:text-[#6b7280] bg-transparent border-0 cursor-pointer mb-6 p-0 transition-colors"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ArrowLeft size={14} />
        Back to schedule
      </motion.button>

      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <span className="text-[#0d9488] text-[0.75rem] tracking-widest uppercase block mb-1" style={{ fontWeight: 600 }}>
          Rotation Analysis
        </span>
        <h1
          className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em]"
          style={{ fontWeight: 600 }}
        >
          Global Product Sync
        </h1>
      </motion.div>

      {/* ─── Schedule Overview Card ─── */}
      <motion.div
        className="bg-white rounded-2xl border border-[#edeef0] shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-6 mb-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
      >
        <h3
          className="text-[#1a1a2e] text-[0.95rem] mb-5"
          style={{ fontWeight: 600 }}
        >
          Schedule Overview
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Fairness Score */}
          <div>
            <p className="text-[#9ca3af] text-[0.82rem] mb-2">Fairness Score</p>
            <div className="flex items-baseline gap-1 mb-3">
              <span
                className="text-[2.6rem] text-[#1a1a2e] tracking-[-0.04em] leading-none"
                style={{ fontWeight: 700 }}
              >
                {fairnessScore}
              </span>
              <span className="text-[1.1rem] text-[#c4c7cc]" style={{ fontWeight: 400 }}>
                / 100
              </span>
            </div>

            {/* Score bar */}
            <div className="w-full h-2 bg-[#f0f0f2] rounded-full overflow-hidden mb-3">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#0d9488] to-[#14b8a6]"
                initial={{ width: 0 }}
                animate={{ width: `${fairnessScore}%` }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              />
            </div>

            {/* Label badge */}
            <span className="inline-flex text-[0.72rem] text-[#0d9488] bg-[#f0fdfa] border border-[#0d9488]/15 px-2.5 py-1 rounded-md" style={{ fontWeight: 500 }}>
              {fairnessLabel}
            </span>
            <p className="text-[#9ca3af] text-[0.78rem] mt-2 leading-relaxed">
              Measures how evenly meeting inconvenience is distributed.
            </p>
          </div>

          {/* Right: Team stats */}
          <div>
            <p className="text-[#1a1a2e] text-[0.88rem] mb-0.5" style={{ fontWeight: 500 }}>
              Global Product Sync
            </p>
            <p className="text-[#9ca3af] text-[0.78rem] mb-4">4-week rotation cycle</p>

            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { value: "5", label: "Max" },
                { value: "5", label: "Spread" },
                { value: "5", label: "Members" },
                { value: "4", label: "Weeks" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-[1.2rem] text-[#0d9488]" style={{ fontWeight: 700 }}>
                    {stat.value}
                  </div>
                  <div className="text-[0.7rem] text-[#9ca3af] mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            <span className="inline-flex text-[0.68rem] text-[#0d9488] bg-[#0d9488] text-white px-2.5 py-1 rounded-md" style={{ fontWeight: 600 }}>
              BEST POSSIBLE
            </span>
            <div className="mt-2 space-y-0.5">
              <p className="text-[#6b7280] text-[0.78rem]">Best available time within constraints.</p>
              <p className="text-[#9ca3af] text-[0.75rem]">Schedule generated using fallback optimization mode.</p>
            </div>
          </div>
        </div>

        {/* Bottom note */}
        <div className="mt-5 pt-4 border-t border-[#f0f0f2]">
          <p className="text-[#6b7280] text-[0.82rem] leading-relaxed">
            This schedule balances inconvenience across the team while respecting working hours and blocked time ranges.
          </p>
        </div>
      </motion.div>

      {/* ─── Two-column: Burden + Meeting Time ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Member Burden Distribution */}
        <motion.div
          className="bg-white rounded-2xl border border-[#edeef0] shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-5"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Users size={15} className="text-[#0d9488]" />
            <h3 className="text-[#1a1a2e] text-[0.9rem]" style={{ fontWeight: 600 }}>
              Member Burden Distribution
            </h3>
          </div>
          <p className="text-[#9ca3af] text-[0.78rem] mb-5">
            Total inconvenience score across the 4-week cycle.
          </p>

          <div className="space-y-3">
            {burdenData.map((entry, i) => (
              <motion.div
                key={entry.initials}
                className="flex items-center gap-2.5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: entry.avatarColor + "18" }}
                >
                  <span className="text-[0.55rem]" style={{ fontWeight: 600, color: entry.avatarColor }}>
                    {entry.initials}
                  </span>
                </div>
                <span className="text-[0.82rem] text-[#1a1a2e] w-28 truncate shrink-0" style={{ fontWeight: 450 }}>
                  {entry.name}
                </span>
                <div className="flex-1 h-2 bg-[#f0f0f2] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: entry.score > 0 ? "#f5c882" : "#e5e7eb" }}
                    initial={{ width: 0 }}
                    animate={{ width: entry.score > 0 ? `${(entry.score / maxBurden) * 100}%` : "4%" }}
                    transition={{ duration: 0.6, delay: 0.3 + i * 0.08 }}
                  />
                </div>
                <span
                  className={`text-[0.84rem] w-5 text-right shrink-0 ${entry.score > 0 ? "text-[#d97706]" : "text-[#c4c7cc]"}`}
                  style={{ fontWeight: entry.score > 0 ? 600 : 400 }}
                >
                  {entry.score}
                </span>
              </motion.div>
            ))}
          </div>

          <p className="text-[#b0b4bc] text-[0.75rem] mt-5 leading-relaxed">
            Burden scores represent early or late meetings outside ideal working hours. Lower scores indicate more comfortable schedules.
          </p>
        </motion.div>

        {/* Meeting Time Rotation */}
        <motion.div
          className="bg-white rounded-2xl border border-[#edeef0] shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-5"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.16 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={15} className="text-[#0d9488]" />
            <h3 className="text-[#1a1a2e] text-[0.9rem]" style={{ fontWeight: 600 }}>
              Meeting Time Rotation
            </h3>
          </div>
          <p className="text-[#9ca3af] text-[0.78rem] mb-5">
            How meeting time shifts across weeks.
          </p>

          <div className="space-y-3">
            {meetingTimes.map((wt, i) => (
              <motion.div
                key={wt.week}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.25 + i * 0.05 }}
              >
                <span className="text-[0.78rem] text-[#9ca3af] w-12 shrink-0">
                  Week {wt.week}
                </span>
                <span className="text-[0.84rem] text-[#1a1a2e] w-20 shrink-0" style={{ fontWeight: 500 }}>
                  {wt.time}
                </span>
                <div className="flex-1 h-3 bg-[#f0f0f2] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: wt.isHeaviest ? "#374151" : "#a7e8de",
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${wt.barPercent}%` }}
                    transition={{ duration: 0.5, delay: 0.35 + i * 0.08 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ─── Sacrifice Timeline ─── */}
      <motion.div
        className="bg-white rounded-2xl border border-[#edeef0] shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-5 mb-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.22 }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Zap size={15} className="text-[#0d9488]" />
            <h3 className="text-[#1a1a2e] text-[0.9rem]" style={{ fontWeight: 600 }}>
              Sacrifice Timeline
            </h3>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 text-[0.72rem] text-[#9ca3af]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0d9488]" />
              Early meeting
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
              Late meeting
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
              Mild inconvenience
            </span>
          </div>
        </div>
        <p className="text-[#9ca3af] text-[0.78rem] mb-5">
          How meeting inconvenience is distributed each week. Each dot = one member outside preferred hours.
        </p>

        {/* Timeline row */}
        <div className="flex items-end gap-2">
          {sacrificeTimeline.map((sw, i) => (
            <motion.div
              key={sw.week}
              className="flex-1 flex flex-col items-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + i * 0.06 }}
            >
              {/* Dots */}
              <div className="flex items-center gap-1 mb-2 min-h-[24px]">
                {sw.dots.map((dot, di) => (
                  <motion.span
                    key={di}
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: dot.color }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.25, delay: 0.4 + i * 0.06 + di * 0.08 }}
                  />
                ))}
              </div>

              {/* Label */}
              <div className="text-center border-t border-[#edeef0] pt-2 w-full">
                <div className="text-[0.75rem] text-[#9ca3af]">Week {sw.week}</div>
                <div className="text-[0.78rem] text-[#6b7280]" style={{ fontWeight: 500 }}>
                  {sw.time}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ─── Timezone Impact (Accordion) ─── */}
      <motion.div
        className="bg-white rounded-2xl border border-[#edeef0] shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden mb-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.28 }}
      >
        <button
          onClick={() => setTzOpen(!tzOpen)}
          className="w-full flex items-center justify-between px-5 py-5 bg-transparent border-0 cursor-pointer text-left"
        >
          <div>
            <h3 className="text-[#1a1a2e] text-[0.9rem]" style={{ fontWeight: 600 }}>
              Timezone Impact
            </h3>
            <p className="text-[#9ca3af] text-[0.78rem] mt-0.5">
              Relative meeting time range per timezone.
            </p>
          </div>
          <motion.div
            animate={{ rotate: tzOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={18} className="text-[#9ca3af]" />
          </motion.div>
        </button>

        <AnimatePresence>
          {tzOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-0">
                {timezoneImpacts.map((tz, i) => (
                  <motion.div
                    key={tz.city}
                    className="flex items-center justify-between py-3 border-b border-[#f5f5f7] last:border-b-0"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.04 }}
                  >
                    <span className="text-[0.86rem] text-[#1a1a2e]" style={{ fontWeight: 450 }}>
                      {tz.city}
                    </span>
                    <span className="text-[0.84rem] text-[#6b7280]">{tz.range}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Why this schedule was selected ─── */}
      <motion.div
        className="bg-white rounded-2xl border border-[#edeef0] shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-6 mb-8"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.34 }}
      >
        <h3 className="text-[#1a1a2e] text-[0.95rem] mb-5" style={{ fontWeight: 600 }}>
          Why this schedule was selected
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {reasonCards.map((card, i) => (
            <motion.div
              key={card.title}
              className="bg-[#f9fafb] rounded-xl p-4 hover:bg-[#f0fdfa] transition-colors duration-200"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 + i * 0.06 }}
            >
              <div className="w-9 h-9 rounded-xl bg-[#f0fdfa] border border-[#0d9488]/10 flex items-center justify-center mb-3">
                <card.icon size={17} className="text-[#0d9488]" />
              </div>
              <h4 className="text-[#1a1a2e] text-[0.84rem] mb-1" style={{ fontWeight: 600 }}>
                {card.title}
              </h4>
              <p className="text-[#9ca3af] text-[0.78rem] leading-relaxed">
                {card.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Back link bottom */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <button
          onClick={() => navigate(`/app/schedule/${scheduleId || "1"}`)}
          className="flex items-center gap-1.5 text-[0.82rem] text-[#9ca3af] hover:text-[#6b7280] bg-transparent border-0 cursor-pointer p-0 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to schedule
        </button>
      </motion.div>
    </div>
  );
}
