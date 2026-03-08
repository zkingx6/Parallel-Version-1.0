import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// DEBUG: Auth disabled to verify if middleware causes infinite "Rendering..."
// --- OLD CODE (commented out) ---
// import { createServerClient } from "@supabase/ssr"
// let supabaseResponse = NextResponse.next({ request: { headers: request.headers } })
// const supabase = createServerClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//   {
//     cookies: {
//       getAll() { return request.cookies.getAll() },
//       setAll(cookiesToSet) {
//         cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
//         supabaseResponse = NextResponse.next({ request: { headers: request.headers } })
//         cookiesToSet.forEach(({ name, value, options }) =>
//           supabaseResponse.cookies.set(name, value, options))
//       },
//     },
//   }
// )
// const { data: { user } } = await supabase.auth.getUser()
// const pathname = request.nextUrl.pathname
// const redirectTo = pathname + request.nextUrl.search
// if (pathname.startsWith("/join/") && !user) {
//   return NextResponse.redirect(new URL(`/?redirect=${encodeURIComponent(redirectTo)}`, request.url))
// }
// if (pathname.startsWith("/member-dashboard") && !user) {
//   return NextResponse.redirect(new URL(`/?redirect=${encodeURIComponent(redirectTo)}`, request.url))
// }
// const requestHeaders = new Headers(request.headers)
// requestHeaders.set("x-pathname", pathname)
// requestHeaders.set("Cookie", request.cookies.getAll().map((c) => `${c.name}=${c.value}`).join("; "))
// const response = NextResponse.next({ request: { headers: requestHeaders } })
// supabaseResponse.cookies.getAll().forEach((c) => response.cookies.set(c.name, c.value, c))
// return response

export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
