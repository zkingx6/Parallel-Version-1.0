import { redirect } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase-server"
import { LoginForm } from "../LoginForm"

export default async function SignupPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect("/teams")

  return <LoginForm />
}
