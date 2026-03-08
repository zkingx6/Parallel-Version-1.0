import { redirect } from "next/navigation"
import { resolvePostLoginRedirect } from "@/lib/actions"

export default async function DashboardPage() {
  const target = await resolvePostLoginRedirect()
  redirect(target)
}
