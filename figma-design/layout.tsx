import { Outlet, useNavigate, useLocation } from "react-router";
import { motion } from "motion/react";

const navItems = [
  { label: "Teams", path: "/app/teams" },
  { label: "Rotation", path: "/app/rotation" },
  { label: "Schedule", path: "/app/schedule" },
];

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* Top navigation */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#edeef0]">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => navigate("/app/teams")}
            className="flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0"
          >
            <div className="w-7 h-7 rounded-lg bg-[#0d9488] flex items-center justify-center">
              <span className="text-white text-[0.7rem]" style={{ fontWeight: 700 }}>
                P
              </span>
            </div>
            <span className="text-[#1a1a2e] text-[0.95rem] tracking-[-0.02em]" style={{ fontWeight: 600 }}>
              Parallel
            </span>
          </button>

          {/* Nav tabs */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`relative px-4 py-1.5 rounded-lg text-[0.84rem] border-0 cursor-pointer transition-colors duration-200 bg-transparent ${
                  isActive(item.path)
                    ? "text-[#1a1a2e]"
                    : "text-[#9ca3af] hover:text-[#6b7280]"
                }`}
                style={{ fontWeight: isActive(item.path) ? 500 : 400 }}
              >
                {item.label}
                {isActive(item.path) && (
                  <motion.div
                    className="absolute bottom-[-9px] left-2 right-2 h-[2px] bg-[#0d9488] rounded-full"
                    layoutId="nav-indicator"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0d9488] to-[#0f766e] flex items-center justify-center cursor-pointer">
            <span className="text-white text-[0.7rem]" style={{ fontWeight: 600 }}>Z</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
