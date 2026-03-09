"use client"

/**
 * Decorative mesh/globe background for hero section.
 * Uses gradients and soft glow — CSS only, no animation libs.
 */
export function GlobeBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {/* Soft radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full opacity-[0.04]"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, oklch(0.55 0.10 182) 0%, transparent 60%)",
        }}
      />
      {/* Secondary mesh layer */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 70% 50%, oklch(0.55 0.10 182) 0%, transparent 70%)",
        }}
      />
      {/* Subtle border ring */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-foreground/5"
      />
    </div>
  )
}
