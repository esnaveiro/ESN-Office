import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { verifySession } from '@/lib/session'

const AUTH_PROVIDER = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? 'esn'

async function getESNSession(request: NextRequest) {
  const token = request.cookies.get('esn_session')?.value
  if (!token) return null
  return verifySession(token)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const protectedPaths = ['/dashboard', '/check-ins', '/profile', '/requests', '/inventory']
  const isProtected = protectedPaths.some(p => pathname.startsWith(p))
  const isAdminPath = pathname.startsWith('/admin')
  const isAuthPath = pathname === '/auth/login' || pathname === '/auth/signup'

  if (AUTH_PROVIDER === 'supabase') {
    let response = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Always call getUser() — refreshes the session and validates the JWT
    const { data: { user } } = await supabase.auth.getUser()

    if ((isProtected || isAdminPath) && !user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    if (isAuthPath && user) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return response
  }

  // ESN auth
  if (isProtected || isAdminPath) {
    const session = await getESNSession(request)

    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    if (isAdminPath && !session.isAdmin) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  if (isAuthPath) {
    const session = await getESNSession(request)
    if (session) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
