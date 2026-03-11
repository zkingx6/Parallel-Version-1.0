/**
 * Shared styles for pricing CTAs across Parallel.
 * Use for secondary pricing buttons: Starter, Enterprise, Choose a plan, Contact sales, etc.
 * Pro / primary CTA uses filled green (separate).
 */

/** Tailwind classes for secondary pricing buttons (default + hover). Default MUST have visible border. */
export const PRICING_SECONDARY_CLASSES =
  "bg-white text-emerald-600 border border-solid border-emerald-200 cursor-pointer transition-colors duration-200 hover:border-emerald-400 hover:bg-emerald-50"

/** For motion.span / motion.button whileHover - emerald-400, emerald-50 */
export const PRICING_SECONDARY_HOVER = {
  borderColor: "#34d399",
  backgroundColor: "#ecfdf5",
} as const
