import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Calendar,
  ChevronRight,
  X,
  Clock,
  Users,
  CheckCircle2,
} from "lucide-react";

interface Schedule {
  id: string;
  name: string;
  teamName: string;
  publishedAt: string;
  weekCount: number;
  memberCount: number;
  status: "active" | "completed";
}

const initialSchedules: Schedule[] = [
  {
    id: "1",
    name: "Global Product Sync",
    teamName: "Global Product Sync",
    publishedAt: "Mar 9, 2026",
    weekCount: 4,
    memberCount: 5,
    status: "active",
  },
  {
    id: "2",
    name: "Global Engineering Org",
    teamName: "Global Engineering Org",
    publishedAt: "Mar 9, 2026",
    weekCount: 8,
    memberCount: 8,
    status: "active",
  },
  {
    id: "3",
    name: "Global Product Sync",
    teamName: "Global Product Sync",
    publishedAt: "Mar 9, 2026",
    weekCount: 6,
    memberCount: 5,
    status: "completed",
  },
  {
    id: "4",
    name: "Global Product Sync",
    teamName: "Global Product Sync",
    publishedAt: "Mar 8, 2026",
    weekCount: 4,
    memberCount: 5,
    status: "completed",
  },
  {
    id: "5",
    name: "NY Dubai",
    teamName: "NY Dubai ✅",
    publishedAt: "Mar 8, 2026",
    weekCount: 8,
    memberCount: 2,
    status: "active",
  },
  {
    id: "6",
    name: "Design A",
    teamName: "NY Dubai ✅",
    publishedAt: "Mar 7, 2026",
    weekCount: 4,
    memberCount: 3,
    status: "completed",
  },
];

export function SchedulePage() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState(initialSchedules);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSchedules(schedules.filter((s) => s.id !== id));
  };

  return (
    <div className="max-w-2xl mx-auto">
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
          Schedule
        </h1>
        <p className="text-[#9ca3af] text-[0.88rem]">
          Published schedules and rotation history.
        </p>
      </motion.div>

      {/* Stats row */}
      <motion.div
        className="grid grid-cols-3 gap-3 mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.04 }}
      >
        {[
          { icon: Calendar, value: schedules.length, label: "Total schedules" },
          { icon: CheckCircle2, value: schedules.filter(s => s.status === "active").length, label: "Active now" },
          { icon: Users, value: new Set(schedules.map(s => s.teamName)).size, label: "Teams" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-[#edeef0] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-[#f0fdfa] flex items-center justify-center">
                <stat.icon size={14} className="text-[#0d9488]" />
              </div>
            </div>
            <div className="text-[1.3rem] text-[#1a1a2e] tracking-[-0.02em]" style={{ fontWeight: 600 }}>
              {stat.value}
            </div>
            <div className="text-[0.75rem] text-[#9ca3af] mt-0.5">{stat.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Published schedules */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
      >
        <h3
          className="text-[#1a1a2e] text-[0.92rem] mb-3"
          style={{ fontWeight: 600 }}
        >
          Published schedules
        </h3>
        <div className="space-y-2">
          {schedules.map((schedule, i) => (
            <motion.div
              key={schedule.id}
              className="group bg-white rounded-xl border border-[#edeef0] px-5 py-4 flex items-center gap-4 cursor-pointer hover:border-[#d1d5db] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-200"
              onClick={() => navigate(`/app/schedule/${schedule.id}`)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.03 }}
              whileHover={{ x: 2 }}
            >
              {/* Teal left accent */}
              <div className="w-1 h-10 rounded-full bg-[#0d9488]/20 group-hover:bg-[#0d9488]/50 transition-colors shrink-0" />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <span className="text-[#1a1a2e] text-[0.88rem] truncate block" style={{ fontWeight: 500 }}>
                  {schedule.name}
                </span>
                <span className="text-[#b0b4bc] text-[0.78rem]">
                  {schedule.teamName}
                </span>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[#b0b4bc] text-[0.78rem]">{schedule.publishedAt}</span>
                <button
                  onClick={(e) => handleDelete(e, schedule.id)}
                  className="p-1 rounded-lg bg-transparent border-0 cursor-pointer text-[#d1d5db] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-all opacity-0 group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
                <ChevronRight size={16} className="text-[#d1d5db] group-hover:text-[#9ca3af] transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
