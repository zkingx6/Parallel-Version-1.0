import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const redirectTo = pathname + request.nextUrl.search

  if (pathname.startsWith("/join/") && !user) {
    return NextResponse.redirect(
      new URL(`/?redirect=${encodeURIComponent(redirectTo)}`, request.url)
    )
  }
  if (pathname.startsWith("/member-dashboard") && !user) {
    return NextResponse.redirect(
      new URL(`/?redirect=${encodeURIComponent(redirectTo)}`, request.url)
    )
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", pathname)
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  supabaseResponse.cookies.getAll().forEach((c) =>
    response.cookies.set(c.name, c.value, c)
  )
  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
