import { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Globe,
  Info,
  GripHorizontal,
  Leaf,
  AlertTriangle,
  BarChart3,
  Send,
} from "lucide-react";

const dayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const durationOptions = ["30 min", "1 hour", "1.5 hours", "2 hours"];
const cycleOptions = ["4 weeks", "6 weeks", "8 weeks", "12 weeks"];

interface MemberTime {
  initials: string;
  name: string;
  time: string;
  isUncomfortable: boolean;
  avatarColor: string;
}

interface WeekSchedule {
  weekNumber: number;
  date: string;
  displayTime: string;
  tag: "lightest" | "heaviest" | null;
  members: MemberTime[];
  summary: string;
}

const mockSchedule: WeekSchedule[] = [
  {
    weekNumber: 1,
    date: "Tue, Mar 10",
    displayTime: "7:00 AM New York (UTC-04:00)",
    tag: "lightest",
    members: [
      { initials: "Z", name: "Zion", time: "7:00 AM", isUncomfortable: true, avatarColor: "#0d9488" },
      { initials: "EW", name: "Emma Wilson", time: "11:00 AM", isUncomfortable: false, avatarColor: "#6366f1" },
      { initials: "SA", name: "Sara Al-Hassan", time: "3:00 PM", isUncomfortable: false, avatarColor: "#ec4899" },
      { initials: "HM", name: "Hans Mueller", time: "12:00 PM", isUncomfortable: false, avatarColor: "#8b5cf6" },
      { initials: "YT", name: "Yuki Tanaka", time: "8:00 PM", isUncomfortable: true, avatarColor: "#f59e0b" },
    ],
    summary: "Most members are comfortable with this time.",
  },
  {
    weekNumber: 2,
    date: "Tue, Mar 17",
    displayTime: "7:30 AM New York (UTC-04:00)",
    tag: "lightest",
    members: [
      { initials: "Z", name: "Zion", time: "7:30 AM", isUncomfortable: true, avatarColor: "#0d9488" },
      { initials: "EW", name: "Emma Wilson", time: "11:30 AM", isUncomfortable: false, avatarColor: "#6366f1" },
      { initials: "SA", name: "Sara Al-Hassan", time: "3:30 PM", isUncomfortable: false, avatarColor: "#ec4899" },
      { initials: "HM", name: "Hans Mueller", time: "12:30 PM", isUncomfortable: false, avatarColor: "#8b5cf6" },
      { initials: "YT", name: "Yuki Tanaka", time: "8:30 PM", isUncomfortable: true, avatarColor: "#f59e0b" },
    ],
    summary: "Most members are comfortable with this time.",
  },
  {
    weekNumber: 3,
    date: "Tue, Mar 24",
    displayTime: "7:00 AM New York (UTC-04:00)",
    tag: "lightest",
    members: [
      { initials: "Z", name: "Zion", time: "7:00 AM", isUncomfortable: true, avatarColor: "#0d9488" },
      { initials: "EW", name: "Emma Wilson", time: "11:00 AM", isUncomfortable: false, avatarColor: "#6366f1" },
      { initials: "SA", name: "Sara Al-Hassan", time: "3:00 PM", isUncomfortable: false, avatarColor: "#ec4899" },
      { initials: "HM", name: "Hans Mueller", time: "12:00 PM", isUncomfortable: false, avatarColor: "#8b5cf6" },
      { initials: "YT", name: "Yuki Tanaka", time: "8:00 PM", isUncomfortable: true, avatarColor: "#f59e0b" },
    ],
    summary: "Most members are comfortable with this time.",
  },
  {
    weekNumber: 4,
    date: "Tue, Mar 31",
    displayTime: "8:00 AM New York (UTC-04:00)",
    tag: "heaviest",
    members: [
      { initials: "Z", name: "Zion", time: "8:00 AM", isUncomfortable: true, avatarColor: "#0d9488" },
      { initials: "EW", name: "Emma Wilson", time: "1:00 PM", isUncomfortable: false, avatarColor: "#6366f1" },
      { initials: "SA", name: "Sara Al-Hassan", time: "4:00 PM", isUncomfortable: false, avatarColor: "#ec4899" },
      { initials: "HM", name: "Hans Mueller", time: "2:00 PM", isUncomfortable: false, avatarColor: "#8b5cf6" },
      { initials: "YT", name: "Yuki Tanaka", time: "9:00 PM", isUncomfortable: true, avatarColor: "#f59e0b" },
    ],
    summary: "Some members take a less convenient time this week.",
  },
];

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

export function RotationPage() {
  const navigate = useNavigate();
  const { teamId } = useParams();
  const [day, setDay] = useState("Tuesday");
  const [duration, setDuration] = useState("1 hour");
  const [cycle, setCycle] = useState("4 weeks");
  const [useFixedBase, setUseFixedBase] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const cycleNum = parseInt(cycle);

  const handlePlan = () => {
    setShowResults(true);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back button */}
      <motion.button
        onClick={() => navigate(`/app/teams/${teamId || "1"}`)}
        className="flex items-center gap-1.5 text-[0.82rem] text-[#9ca3af] hover:text-[#6b7280] bg-transparent border-0 cursor-pointer mb-6 p-0 transition-colors"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ArrowLeft size={14} />
        Back to team
      </motion.button>

      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1
          className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] mb-1"
          style={{ fontWeight: 600 }}
        >
          No Overlap + Never Time (图二)
        </h1>
        <p className="text-[#9ca3af] text-[0.88rem]">
          Configure the meeting and plan a fair rotation.
        </p>
      </motion.div>

      {/* Meeting config card */}
      <motion.div
        className="bg-white rounded-2xl border border-[#edeef0] shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-6 mb-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={16} className="text-[#0d9488]" />
          <h3
            className="text-[#1a1a2e] text-[0.95rem]"
            style={{ fontWeight: 600 }}
          >
            The meeting
          </h3>
        </div>
        <p className="text-[#9ca3af] text-[0.82rem] mb-5">
          Define cadence and cycle length.
        </p>

        <div className="bg-[#f9fafb] rounded-xl p-4 space-y-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[0.84rem] text-[#6b7280]">Weekly on</span>
            <SelectPill
              value={day}
              options={dayOptions}
              onChange={setDay}
              icon={<Calendar size={12} />}
            />
            <span className="text-[0.84rem] text-[#6b7280]">for</span>
            <SelectPill
              value={duration}
              options={durationOptions}
              onChange={setDuration}
              icon={<Clock size={12} />}
            />
            <span className="text-[0.84rem] text-[#6b7280]">over</span>
            <SelectPill
              value={cycle}
              options={cycleOptions}
              onChange={setCycle}
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[0.84rem] text-[#6b7280]">Start week:</span>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#e5e7eb] bg-white text-[0.84rem] text-[#1a1a2e]">
              <Calendar size={12} className="text-[#9ca3af]" />
              mm/dd/yyyy
            </div>
            <span className="text-[0.78rem] text-[#b0b4bc]">
              (optional) → Next Tue, Mar 10 (auto)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[0.84rem] text-[#6b7280]">displayed in</span>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#e5e7eb] bg-white text-[0.84rem] text-[#1a1a2e]">
              <Globe size={12} className="text-[#0d9488]" />
              New York (UTC-04:00)
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 px-1 text-[0.78rem] text-[#b0b4bc]">
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>
            Times displayed in New York (UTC-04:00). Algorithm runs in UTC.
          </span>
        </div>
      </motion.div>

      {/* Fixed base time option */}
      <motion.div
        className="bg-white rounded-2xl border border-[#edeef0] shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-6 mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12 }}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={() => setUseFixedBase(!useFixedBase)}
            className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 cursor-pointer transition-all ${
              useFixedBase
                ? "bg-[#0d9488] text-white border-0"
                : "bg-white border border-[#d1d5db]"
            }`}
            style={{
              borderWidth: useFixedBase ? 0 : 1,
              borderStyle: "solid",
              borderColor: "#d1d5db",
            }}
          >
            {useFixedBase && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
          <div>
            <span
              className="text-[#1a1a2e] text-[0.88rem]"
              style={{ fontWeight: 500 }}
            >
              Use a fixed base time
            </span>
            <p className="text-[#b0b4bc] text-[0.78rem] mt-0.5">
              If disabled, Parallel will choose the fairest time for the team.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Plan button */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.18 }}
      >
        <motion.button
          onClick={handlePlan}
          className="w-full py-3.5 rounded-xl bg-[#0d9488] text-white text-[0.92rem] border-0 cursor-pointer"
          style={{ fontWeight: 500 }}
          whileHover={{
            backgroundColor: "#0f766e",
            boxShadow: "0 6px 24px rgba(13,148,136,0.20)",
          }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.2 }}
        >
          Plan the next {cycle} fairly
        </motion.button>
      </motion.div>

      {/* ─────────────── ROTATION RESULTS ─────────────── */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            ref={resultsRef}
            className="mt-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Section header */}
            <motion.div
              className="mb-2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <h2
                className="text-[1.25rem] text-[#1a1a2e] tracking-[-0.02em] mb-1"
                style={{ fontWeight: 600 }}
              >
                Rotation schedule
              </h2>
              <p className="text-[#9ca3af] text-[0.84rem] leading-relaxed">
                {cycleNum} weeks — time rotates, burden distributed transparently.{" "}
                <span className="text-[#b0b4bc]">(Auto fair mode)</span>
              </p>
              <p className="text-[#c4c7cc] text-[0.78rem] mt-1">
                Drag to reorder weeks if needed. This does not change the fairness calculation.
              </p>
            </motion.div>

            {/* Week cards */}
            <div className="space-y-4 mt-6">
              {mockSchedule.slice(0, cycleNum).map((week, i) => (
                <WeekCard key={week.weekNumber} week={week} index={i} />
              ))}
            </div>

            {/* Burden summary */}
            <motion.div
              className="mt-8 bg-white rounded-2xl border border-[#edeef0] shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + mockSchedule.length * 0.06 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={16} className="text-[#0d9488]" />
                <h3 className="text-[#1a1a2e] text-[0.95rem]" style={{ fontWeight: 600 }}>
                  Over {cycleNum} weeks
                </h3>
              </div>

              <div className="space-y-1.5 mb-5">
                <div className="flex items-center gap-2 text-[0.84rem] text-[#4b5563]">
                  <span className="w-1 h-1 rounded-full bg-[#0d9488] shrink-0" />
                  No one has more than 5 uncomfortable meetings
                </div>
                <div className="flex items-center gap-2 text-[0.84rem] text-[#4b5563]">
                  <span className="w-1 h-1 rounded-full bg-[#0d9488] shrink-0" />
                  Burden differs by at most 5 between members
                </div>
              </div>

              {/* Burden bars */}
              <div className="space-y-3">
                {burdenData.map((entry, i) => (
                  <motion.div
                    key={entry.initials}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: entry.avatarColor + "18" }}
                    >
                      <span
                        className="text-[0.6rem]"
                        style={{ fontWeight: 600, color: entry.avatarColor }}
                      >
                        {entry.initials}
                      </span>
                    </div>

                    {/* Name */}
                    <span className="text-[0.84rem] text-[#1a1a2e] w-32 shrink-0 truncate" style={{ fontWeight: 450 }}>
                      {entry.name}
                    </span>

                    {/* Bar */}
                    <div className="flex-1 h-2.5 bg-[#f0f0f2] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: entry.score > 0 ? "#f5c882" : "#e5e7eb",
                        }}
                        initial={{ width: 0 }}
                        animate={{
                          width: entry.score > 0
                            ? `${(entry.score / maxBurden) * 100}%`
                            : "4%",
                        }}
                        transition={{ duration: 0.6, delay: 0.5 + i * 0.08, ease: "easeOut" }}
                      />
                    </div>

                    {/* Score */}
                    <span
                      className={`text-[0.84rem] w-6 text-right shrink-0 ${
                        entry.score > 0 ? "text-[#d97706]" : "text-[#c4c7cc]"
                      }`}
                      style={{ fontWeight: entry.score > 0 ? 600 : 400 }}
                    >
                      {entry.score}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              className="mt-8 flex items-center justify-center gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <motion.button
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[#0d9488] text-[#0d9488] bg-white text-[0.88rem] cursor-pointer"
                style={{ fontWeight: 500 }}
                whileHover={{
                  backgroundColor: "#f0fdfa",
                  boxShadow: "0 2px 12px rgba(13,148,136,0.08)",
                }}
                whileTap={{ scale: 0.98 }}
              >
                <BarChart3 size={15} />
                View rotation analysis
              </motion.button>

              <motion.button
                onClick={() => navigate("/app/schedule")}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0d9488] text-white text-[0.88rem] border-0 cursor-pointer"
                style={{ fontWeight: 500 }}
                whileHover={{
                  backgroundColor: "#0f766e",
                  boxShadow: "0 6px 24px rgba(13,148,136,0.25)",
                }}
                whileTap={{ scale: 0.98 }}
              >
                <Send size={15} />
                Publish schedule
              </motion.button>
            </motion.div>

            {/* Back to team link */}
            <motion.div
              className="mt-10 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.6 }}
            >
              <button
                onClick={() => navigate(`/app/teams/${teamId || "1"}`)}
                className="flex items-center gap-1.5 text-[0.82rem] text-[#9ca3af] hover:text-[#6b7280] bg-transparent border-0 cursor-pointer p-0 transition-colors"
              >
                <ArrowLeft size={14} />
                Back to team
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────── Week Card ─────────── */
function WeekCard({ week, index }: { week: WeekSchedule; index: number }) {
  return (
    <motion.div
      className="bg-white rounded-2xl border border-[#edeef0] shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden group"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 + index * 0.06 }}
    >
      {/* Week header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <GripHorizontal
            size={16}
            className="text-[#d1d5db] cursor-grab hover:text-[#9ca3af] transition-colors"
          />
          <span className="text-[#1a1a2e] text-[0.92rem]" style={{ fontWeight: 600 }}>
            Week {week.weekNumber}
          </span>

          {/* Tag badge */}
          {week.tag === "lightest" && (
            <span className="inline-flex items-center gap-1 text-[0.68rem] text-[#0d9488] bg-[#f0fdfa] border border-[#0d9488]/15 px-2.5 py-0.5 rounded-full" style={{ fontWeight: 500 }}>
              <Leaf size={10} />
              Lightest week
            </span>
          )}
          {week.tag === "heaviest" && (
            <span className="inline-flex items-center gap-1 text-[0.68rem] text-[#d97706] bg-[#fffbeb] border border-[#d97706]/15 px-2.5 py-0.5 rounded-full" style={{ fontWeight: 500 }}>
              <AlertTriangle size={10} />
              Heaviest week
            </span>
          )}

          <span className="text-[0.82rem] text-[#b0b4bc]">{week.date}</span>
        </div>
        <span className="text-[0.75rem] text-[#b0b4bc]">{week.displayTime}</span>
      </div>

      {/* Members */}
      <div className="px-5 pb-2">
        {week.members.map((member, i) => (
          <motion.div
            key={member.initials}
            className={`flex items-center justify-between py-2.5 ${
              i < week.members.length - 1 ? "" : ""
            } ${
              member.isUncomfortable
                ? "bg-[#fef8f0] -mx-5 px-5 border-l-2 border-l-[#f5c882]"
                : ""
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.25 + index * 0.06 + i * 0.03 }}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: member.avatarColor + "18" }}
              >
                <span
                  className="text-[0.6rem]"
                  style={{ fontWeight: 600, color: member.avatarColor }}
                >
                  {member.initials}
                </span>
              </div>
              <span
                className="text-[0.86rem] text-[#1a1a2e]"
                style={{ fontWeight: member.isUncomfortable ? 500 : 400 }}
              >
                {member.name}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`text-[0.86rem] ${
                  member.isUncomfortable
                    ? "text-[#d97706]"
                    : "text-[#6b7280]"
                }`}
                style={{ fontWeight: member.isUncomfortable ? 600 : 400 }}
              >
                {member.time}
              </span>
              {member.isUncomfortable && (
                <span className="text-[#f5c882] text-[0.7rem]">★</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Summary */}
      <div className="px-5 pb-4 pt-1">
        <p
          className={`text-[0.78rem] italic ${
            week.tag === "heaviest" ? "text-[#d97706]" : "text-[#0d9488]"
          }`}
        >
          {week.summary}
        </p>
      </div>
    </motion.div>
  );
}

/* ─────────── Select Pill ─────────── */
function SelectPill({
  value,
  options,
  onChange,
  icon,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e5e7eb] bg-white text-[0.84rem] text-[#1a1a2e] cursor-pointer hover:border-[#d1d5db] transition-colors"
        style={{ fontWeight: 500 }}
      >
        {icon && <span className="text-[#0d9488]">{icon}</span>}
        {value}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-0.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <motion.div
            className="absolute top-full left-0 mt-1 bg-white rounded-xl border border-[#e5e7eb] shadow-[0_8px_32px_rgba(0,0,0,0.08)] py-1 z-50 min-w-[120px]"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-[0.82rem] bg-transparent border-0 cursor-pointer hover:bg-[#f0fdfa] transition-colors ${
                  opt === value
                    ? "text-[#0d9488]"
                    : "text-[#4b5563]"
                }`}
                style={{ fontWeight: opt === value ? 500 : 400 }}
              >
                {opt}
              </button>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
}
