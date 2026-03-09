import { useNavigate, useParams } from "react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  BarChart3,
  GripHorizontal,
  Leaf,
  AlertTriangle,
} from "lucide-react";

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

const schedulesData: Record<
  string,
  { name: string; teamName: string; weeks: WeekSchedule[] }
> = {
  "1": {
    name: "Global Product Sync",
    teamName: "Global Product Sync",
    weeks: [
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
        tag: null,
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
    ],
  },
};

const defaultSchedule = schedulesData["1"];

export function ScheduleDetail() {
  const navigate = useNavigate();
  const { scheduleId } = useParams();
  const schedule = schedulesData[scheduleId || "1"] || defaultSchedule;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back */}
      <motion.button
        onClick={() => navigate("/app/schedule")}
        className="flex items-center gap-1.5 text-[0.82rem] text-[#9ca3af] hover:text-[#6b7280] bg-transparent border-0 cursor-pointer mb-6 p-0 transition-colors"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ArrowLeft size={14} />
        Back to schedules
      </motion.button>

      {/* Header + CTA */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1
          className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] mb-2"
          style={{ fontWeight: 600 }}
        >
          {schedule.name}
        </h1>
        <div className="flex items-center gap-4 flex-wrap">
          <p className="text-[#9ca3af] text-[0.88rem]">
            {schedule.teamName} — time rotates, burden distributed transparently.
          </p>
          <motion.button
            onClick={() => navigate(`/app/schedule/${scheduleId || "1"}/analysis`)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d9488] text-white text-[0.82rem] border-0 cursor-pointer shrink-0"
            style={{ fontWeight: 500 }}
            whileHover={{
              backgroundColor: "#0f766e",
              boxShadow: "0 4px 16px rgba(13,148,136,0.2)",
            }}
            whileTap={{ scale: 0.97 }}
          >
            <BarChart3 size={14} />
            Rotation analysis
          </motion.button>
        </div>
      </motion.div>

      {/* Section title */}
      <motion.div
        className="mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
      >
        <h2 className="text-[#1a1a2e] text-[1.05rem] tracking-[-0.02em]" style={{ fontWeight: 600 }}>
          Rotation schedule
        </h2>
        <p className="text-[#9ca3af] text-[0.82rem] mt-0.5">
          {schedule.weeks.length} weeks — time rotates, burden distributed transparently.{" "}
          <span className="text-[#c4c7cc]">(Auto fair mode)</span>
        </p>
      </motion.div>

      {/* Week cards */}
      <div className="space-y-4 mt-5">
        {schedule.weeks.map((week, i) => (
          <motion.div
            key={week.weekNumber}
            className="bg-white rounded-2xl border border-[#edeef0] shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 + i * 0.06 }}
          >
            {/* Week header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <GripHorizontal size={16} className="text-[#d1d5db] cursor-grab hover:text-[#9ca3af] transition-colors" />
                <span className="text-[#1a1a2e] text-[0.92rem]" style={{ fontWeight: 600 }}>
                  Week {week.weekNumber}
                </span>
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
              <span className="text-[0.75rem] text-[#b0b4bc] hidden sm:block">{week.displayTime}</span>
            </div>

            {/* Members */}
            <div className="px-5 pb-2">
              {week.members.map((member, mi) => (
                <div
                  key={member.initials}
                  className={`flex items-center justify-between py-2.5 ${
                    member.isUncomfortable
                      ? "bg-[#fef8f0] -mx-5 px-5 border-l-2 border-l-[#f5c882]"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: member.avatarColor + "18" }}
                    >
                      <span className="text-[0.6rem]" style={{ fontWeight: 600, color: member.avatarColor }}>
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
                        member.isUncomfortable ? "text-[#d97706]" : "text-[#6b7280]"
                      }`}
                      style={{ fontWeight: member.isUncomfortable ? 600 : 400 }}
                    >
                      {member.time}
                    </span>
                    {member.isUncomfortable && (
                      <span className="text-[#f5c882] text-[0.7rem]">★</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="px-5 pb-4 pt-1">
              <p className={`text-[0.78rem] italic ${week.tag === "heaviest" ? "text-[#d97706]" : "text-[#0d9488]"}`}>
                {week.summary}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
