/**
 * Gate for /api/dev/* routes. Blocks production and preview deployments.
 * Does not rely solely on NODE_ENV (can be misconfigured).
 */
export function isDevRouteAllowed(): boolean {
  const v = process.env.VERCEL_ENV
  if (v === "production" || v === "preview") return false
  if (v === "development") return true
  return process.env.NODE_ENV === "development"
}
