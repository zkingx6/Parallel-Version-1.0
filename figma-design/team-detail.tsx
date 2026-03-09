import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Copy,
  Check,
  Pencil,
  X,
  Clock,
  Globe,
  Shield,
  ArrowRight,
} from "lucide-react";
import { AvailabilityModal } from "./availability-modal";

interface TeamMember {
  id: string;
  initials: string;
  name: string;
  role: string;
  timezone: string;
  utcOffset: string;
  hours: string;
  isOwner: boolean;
  hardBoundaries: number;
  avatarColor: string;
}

const teamsData: Record<string, { name: string; members: TeamMember[] }> = {
  "1": {
    name: "No Overlap + Never Time (图二)",
    members: [
      {
        id: "z1",
        initials: "Z",
        name: "Zion",
        role: "Owner",
        timezone: "New York",
        utcOffset: "UTC-04:00",
        hours: "9:00 AM – 6:00 PM",
        isOwner: true,
        hardBoundaries: 1,
        avatarColor: "#0d9488",
      },
      {
        id: "ob",
        initials: "OB",
        name: "Olivia Brown",
        role: "Design",
        timezone: "London",
        utcOffset: "UTC+00:00",
        hours: "9:00 AM – 5:00 PM",
        isOwner: false,
        hardBoundaries: 0,
        avatarColor: "#6366f1",
      },
      {
        id: "wz",
        initials: "WZ",
        name: "Wei Zhang",
        role: "Engineering",
        timezone: "Singapore",
        utcOffset: "UTC+08:00",
        hours: "9:00 AM – 5:00 PM",
        isOwner: false,
        hardBoundaries: 0,
        avatarColor: "#ec4899",
      },
      {
        id: "lo",
        initials: "LO",
        name: "Liam O'Connor",
        role: "Product",
        timezone: "Sydney",
        utcOffset: "UTC+11:00",
        hours: "9:00 AM – 5:00 PM",
        isOwner: false,
        hardBoundaries: 0,
        avatarColor: "#f59e0b",
      },
    ],
  },
};

// Fallback for any team ID
const defaultTeam = teamsData["1"];

export function TeamDetail() {
  const navigate = useNavigate();
  const { teamId } = useParams();
  const team = teamsData[teamId || "1"] || defaultTeam;

  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const inviteLink = "http://localhost:3000/join/b09eaf1242d59cbc08889f3167636fa5";

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setShowModal(true);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back button */}
      <motion.button
        onClick={() => navigate("/app/teams")}
        className="flex items-center gap-1.5 text-[0.82rem] text-[#9ca3af] hover:text-[#6b7280] bg-transparent border-0 cursor-pointer mb-6 p-0 transition-colors"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ArrowLeft size={14} />
        Back to Teams
      </motion.button>

      {/* Team name */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <h1
            className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em]"
            style={{ fontWeight: 600 }}
          >
            {team.name}
          </h1>
          <button className="p-1.5 rounded-lg bg-transparent border-0 cursor-pointer text-[#c4c7cc] hover:text-[#6b7280] hover:bg-[#f0f0f2] transition-all">
            <Pencil size={14} />
          </button>
        </div>
        <p className="text-[#9ca3af] text-[0.88rem]">
          Invite your team, then plan a fair rotation.
        </p>
      </motion.div>

      {/* Invite link card */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
      >
        <h3
          className="text-[#1a1a2e] text-[0.95rem] mb-1"
          style={{ fontWeight: 600 }}
        >
          Invite link
        </h3>
        <p className="text-[#9ca3af] text-[0.82rem] mb-3">
          Share this link with your team. They set their own timezone and boundaries.
        </p>
        <div className="bg-white rounded-xl border border-[#edeef0] px-4 py-3 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <code className="flex-1 text-[0.8rem] text-[#6b7280] truncate font-mono">
            {inviteLink}
          </code>
          <motion.button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#e5e7eb] bg-white text-[0.8rem] cursor-pointer hover:border-[#d1d5db] hover:bg-[#f9fafb] transition-all"
            style={{ fontWeight: 500, color: copied ? "#0d9488" : "#4b5563" }}
            whileTap={{ scale: 0.97 }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied!" : "Copy"}
          </motion.button>
        </div>
      </motion.div>

      {/* Team members */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3
              className="text-[#1a1a2e] text-[0.95rem]"
              style={{ fontWeight: 600 }}
            >
              Team ({team.members.length})
            </h3>
            <p className="text-[#9ca3af] text-[0.82rem] mt-0.5">
              Members who have submitted their availability.
            </p>
          </div>
          <button className="text-[0.8rem] text-[#0d9488] hover:text-[#0f766e] bg-transparent border-0 cursor-pointer transition-colors" style={{ fontWeight: 500 }}>
            Refresh
          </button>
        </div>

        <div className="space-y-2">
          {team.members.map((member, i) => (
            <motion.div
              key={member.id}
              className="group bg-white rounded-xl border border-[#edeef0] px-5 py-4 hover:border-[#d1d5db] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-200"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.14 + i * 0.04 }}
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: member.avatarColor + "18" }}
                >
                  <span
                    className="text-[0.75rem]"
                    style={{ fontWeight: 600, color: member.avatarColor }}
                  >
                    {member.initials}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[#1a1a2e] text-[0.88rem]"
                      style={{ fontWeight: 500 }}
                    >
                      {member.name}
                    </span>
                    {member.isOwner ? (
                      <span
                        className="text-[0.68rem] text-[#0d9488] bg-[#f0fdfa] px-2 py-0.5 rounded-full border border-[#0d9488]/15"
                        style={{ fontWeight: 500 }}
                      >
                        Owner
                      </span>
                    ) : (
                      <span className="text-[0.68rem] text-[#9ca3af] bg-[#f4f5f7] px-2 py-0.5 rounded-full">
                        {member.role}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[0.78rem] text-[#9ca3af]">
                    <span className="flex items-center gap-1">
                      <Globe size={11} />
                      {member.timezone} ({member.utcOffset})
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {member.hours}
                    </span>
                    {member.hardBoundaries > 0 && (
                      <span className="flex items-center gap-1 text-[#f59e0b]">
                        <Shield size={11} />
                        {member.hardBoundaries} hard boundary
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {member.isOwner ? (
                    <button
                      onClick={() => handleEdit(member)}
                      className="text-[0.78rem] text-[#0d9488] hover:text-[#0f766e] bg-transparent border-0 cursor-pointer transition-colors"
                      style={{ fontWeight: 500 }}
                    >
                      Edit
                    </button>
                  ) : (
                    <button className="p-1.5 rounded-lg bg-transparent border-0 cursor-pointer text-[#d1d5db] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-all opacity-0 group-hover:opacity-100">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Configure rotation CTA */}
      <motion.div
        className="mt-8 flex justify-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <motion.button
          onClick={() => navigate(`/app/rotation/${teamId || "1"}`)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0d9488] text-white text-[0.88rem] border-0 cursor-pointer"
          style={{ fontWeight: 500 }}
          whileHover={{
            backgroundColor: "#0f766e",
            boxShadow: "0 4px 16px rgba(13,148,136,0.25)",
            gap: "10px",
          }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          <ArrowRight size={15} />
          Configure rotation & plan schedule
        </motion.button>
      </motion.div>

      {/* Availability modal */}
      <AnimatePresence>
        {showModal && editingMember && (
          <AvailabilityModal
            member={editingMember}
            onClose={() => {
              setShowModal(false);
              setEditingMember(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
