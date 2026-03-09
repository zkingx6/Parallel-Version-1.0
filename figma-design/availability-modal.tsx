import { useState } from "react";
import { motion } from "motion/react";
import { X, Check } from "lucide-react";

interface AvailabilityModalProps {
  member: {
    name: string;
    timezone: string;
    utcOffset: string;
  };
  onClose: () => void;
}

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function AvailabilityModal({ member, onClose }: AvailabilityModalProps) {
  const [name, setName] = useState(member.name);
  const [role, setRole] = useState("");
  const [enabledDays, setEnabledDays] = useState<Record<string, boolean>>({
    Monday: true,
    Tuesday: true,
    Wednesday: true,
    Thursday: true,
    Friday: true,
    Saturday: false,
    Sunday: false,
  });

  const toggleDay = (day: string) => {
    setEnabledDays((prev) => ({ ...prev, [day]: !prev[day] }));
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Modal */}
      <motion.div
        className="relative bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.12)] w-full max-w-lg max-h-[85vh] overflow-y-auto"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.25 }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2
                className="text-[1.15rem] text-[#1a1a2e] tracking-[-0.02em]"
                style={{ fontWeight: 600 }}
              >
                Update your availability
              </h2>
              <p className="text-[#9ca3af] text-[0.82rem] mt-1 leading-relaxed">
                Set your timezone, working hours, and hard boundaries so you can
                be included in the fair rotation.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-transparent border-0 cursor-pointer text-[#c4c7cc] hover:text-[#6b7280] hover:bg-[#f0f0f2] transition-all -mt-1 -mr-1"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form fields */}
          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="text-[0.82rem] text-[#4b5563] mb-1.5 block" style={{ fontWeight: 500 }}>
                Your name <span className="text-[#ef4444]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#e5e7eb] bg-white text-[0.88rem] text-[#1a1a2e] focus:outline-none focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/10 transition-all"
              />
            </div>

            {/* Role */}
            <div>
              <label className="text-[0.82rem] text-[#4b5563] mb-1.5 block" style={{ fontWeight: 500 }}>
                Role (optional)
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Frontend Lead"
                className="w-full px-4 py-2.5 rounded-xl border border-[#e5e7eb] bg-white text-[0.88rem] text-[#1a1a2e] placeholder:text-[#c4c7cc] focus:outline-none focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/10 transition-all"
              />
            </div>

            {/* Timezone */}
            <div>
              <label className="text-[0.82rem] text-[#4b5563] mb-1.5 block" style={{ fontWeight: 500 }}>
                Timezone <span className="text-[#ef4444]">*</span>
              </label>
              <div className="w-full px-4 py-2.5 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] text-[0.88rem] text-[#1a1a2e]">
                {member.timezone} ({member.utcOffset})
              </div>
            </div>

            {/* Working hours */}
            <div>
              <label className="text-[0.82rem] text-[#4b5563] mb-1 block" style={{ fontWeight: 500 }}>
                Working hours <span className="text-[#ef4444]">*</span>
              </label>
              <p className="text-[#b0b4bc] text-[0.78rem] mb-3">
                Set the days and times when you usually work. These hours help
                estimate inconvenience during rotation.
              </p>

              <div className="space-y-1.5">
                {daysOfWeek.map((day) => (
                  <div
                    key={day}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 ${
                      enabledDays[day] ? "bg-white" : "bg-[#f9fafb]"
                    }`}
                  >
                    <button
                      onClick={() => toggleDay(day)}
                      className={`w-5 h-5 rounded flex items-center justify-center border-0 cursor-pointer shrink-0 transition-all ${
                        enabledDays[day]
                          ? "bg-[#0d9488] text-white"
                          : "bg-white border border-[#d1d5db]"
                      }`}
                      style={{ borderWidth: enabledDays[day] ? 0 : 1, borderStyle: "solid", borderColor: "#d1d5db" }}
                    >
                      {enabledDays[day] && <Check size={12} strokeWidth={3} />}
                    </button>
                    <span
                      className={`text-[0.84rem] w-24 ${
                        enabledDays[day] ? "text-[#1a1a2e]" : "text-[#c4c7cc]"
                      }`}
                      style={{ fontWeight: enabledDays[day] ? 500 : 400 }}
                    >
                      {day}
                    </span>
                    {enabledDays[day] ? (
                      <span className="text-[0.8rem] text-[#6b7280]">
                        9:00 AM &nbsp;—&nbsp; 6:00 PM
                      </span>
                    ) : (
                      <span className="text-[0.8rem] text-[#d1d5db]">Off</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Hard boundaries */}
            <div>
              <label className="text-[0.82rem] text-[#4b5563] mb-1 block" style={{ fontWeight: 500 }}>
                Never available (hard boundaries)
              </label>
              <p className="text-[#b0b4bc] text-[0.78rem]">
                Time ranges when you are absolutely unavailable. Up to 6 hours each.
              </p>
            </div>
          </div>

          {/* Save button */}
          <div className="mt-6 pt-4 border-t border-[#f0f0f2]">
            <motion.button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#0d9488] text-white text-[0.88rem] border-0 cursor-pointer"
              style={{ fontWeight: 500 }}
              whileHover={{ backgroundColor: "#0f766e" }}
              whileTap={{ scale: 0.99 }}
            >
              Save availability
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
