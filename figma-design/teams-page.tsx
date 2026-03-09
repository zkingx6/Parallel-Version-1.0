import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Users, ChevronRight, X, Calendar } from "lucide-react";

interface Team {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
  hasSchedule: boolean;
}

const initialTeams: Team[] = [
  { id: "1", name: "No Overlap + Never Time (图二)", createdAt: "Mar 8, 2026", memberCount: 4, hasSchedule: false },
  { id: "2", name: "Impossible Global Sync", createdAt: "Mar 8, 2026", memberCount: 6, hasSchedule: false },
  { id: "3", name: "Global Engineering Org", createdAt: "Mar 8, 2026", memberCount: 8, hasSchedule: true },
  { id: "4", name: "Global Product Sync", createdAt: "Mar 8, 2026", memberCount: 5, hasSchedule: true },
  { id: "5", name: "Design", createdAt: "Mar 7, 2026", memberCount: 3, hasSchedule: false },
  { id: "6", name: "NY Dubai ✅", createdAt: "Mar 7, 2026", memberCount: 2, hasSchedule: true },
];

export function TeamsPage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [newTeamName, setNewTeamName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = () => {
    if (!newTeamName.trim()) return;
    const newTeam: Team = {
      id: String(Date.now()),
      name: newTeamName.trim(),
      createdAt: "Mar 9, 2026",
      memberCount: 1,
      hasSchedule: false,
    };
    setTeams([newTeam, ...teams]);
    setNewTeamName("");
    setShowCreate(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTeams(teams.filter((t) => t.id !== id));
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] mb-1" style={{ fontWeight: 600 }}>
          Your teams
        </h1>
        <p className="text-[#9ca3af] text-[0.88rem]">
          Create a team, invite members, and plan fair rotation schedules.
        </p>
      </motion.div>

      {/* Create team */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <AnimatePresence mode="wait">
          {!showCreate ? (
            <motion.button
              key="trigger"
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 border-dashed border-[#e0e2e6] bg-white/50 hover:border-[#0d9488]/40 hover:bg-[#f0fdfa]/50 transition-all duration-200 cursor-pointer text-[0.88rem] text-[#9ca3af] hover:text-[#0d9488] group"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <div className="w-8 h-8 rounded-lg bg-[#f0f0f2] group-hover:bg-[#ccfbf1] flex items-center justify-center transition-colors duration-200">
                <Plus size={16} className="text-[#9ca3af] group-hover:text-[#0d9488] transition-colors" />
              </div>
              Create a new team
            </motion.button>
          ) : (
            <motion.div
              key="form"
              className="bg-white rounded-xl border border-[#e5e7eb] p-4 shadow-[0_1px_6px_rgba(0,0,0,0.04)]"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="Team name..."
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] text-[0.88rem] text-[#1a1a2e] placeholder:text-[#c4c7cc] focus:outline-none focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/10 transition-all"
                  autoFocus
                />
                <button
                  onClick={handleCreate}
                  disabled={!newTeamName.trim()}
                  className="px-5 py-2.5 rounded-lg bg-[#0d9488] text-white text-[0.84rem] border-0 cursor-pointer hover:bg-[#0f766e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ fontWeight: 500 }}
                >
                  Create
                </button>
                <button
                  onClick={() => { setShowCreate(false); setNewTeamName(""); }}
                  className="p-2 rounded-lg bg-transparent border-0 cursor-pointer text-[#9ca3af] hover:text-[#6b7280] hover:bg-[#f0f0f2] transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Team list */}
      <div className="space-y-2">
        {teams.map((team, i) => (
          <motion.div
            key={team.id}
            onClick={() => navigate(`/app/teams/${team.id}`)}
            className="group bg-white rounded-xl border border-[#edeef0] px-5 py-4 flex items-center gap-4 cursor-pointer hover:border-[#d1d5db] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-200"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.06 + i * 0.03 }}
            whileHover={{ x: 2 }}
          >
            {/* Icon */}
            <div className="w-10 h-10 rounded-xl bg-[#f0fdfa] flex items-center justify-center shrink-0 group-hover:bg-[#ccfbf1] transition-colors duration-200">
              <Users size={17} className="text-[#0d9488]" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[#1a1a2e] text-[0.9rem] truncate" style={{ fontWeight: 500 }}>
                  {team.name}
                </span>
                {team.hasSchedule && (
                  <span className="flex items-center gap-1 text-[0.7rem] text-[#0d9488] bg-[#f0fdfa] px-2 py-0.5 rounded-full shrink-0" style={{ fontWeight: 500 }}>
                    <Calendar size={10} />
                    Published
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[#b0b4bc] text-[0.78rem]">{team.memberCount} members</span>
                <span className="text-[#d1d5db]">·</span>
                <span className="text-[#b0b4bc] text-[0.78rem]">{team.createdAt}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => handleDelete(e, team.id)}
                className="p-1.5 rounded-lg bg-transparent border-0 cursor-pointer text-[#d1d5db] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-all opacity-0 group-hover:opacity-100"
              >
                <X size={14} />
              </button>
              <ChevronRight size={16} className="text-[#d1d5db] group-hover:text-[#9ca3af] transition-colors" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
