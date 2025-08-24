import { NextResponse } from "next/server"
import { withAuth } from "next-auth/middleware"
import { getToken } from "next-auth/jwt"

export default withAuth(
  async function middleware(req) {
    const token = await getToken({ req })
    const { pathname } = req.nextUrl

    // Skip maintenance check for auth-related paths and admin paths
    const isAuthPath = pathname.startsWith('/api/auth') || 
                      pathname === '/' || 
                      pathname === '/register'
    const isAdminPath = pathname.startsWith('/admin')

    // If maintenance mode is enabled, check user access
    if (!isAuthPath && !isAdminPath) {
      try {
        // Check maintenance mode status
        const settingsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/settings`)
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json()
          
          if (settings.maintenanceMode) {
            // Only allow admin users to access non-admin pages during maintenance
            if (!token || token.role !== 'ADMIN') {
              // Redirect to login page with maintenance message
              const loginUrl = new URL('/', req.url)
              loginUrl.searchParams.set('error', 'maintenance')
              return NextResponse.redirect(loginUrl)
            }
          }
        }
      } catch (error) {
        console.error('Error checking maintenance mode:', error)
        // If we can't check maintenance mode, allow access
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    }
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}