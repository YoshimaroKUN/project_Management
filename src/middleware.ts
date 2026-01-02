import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Check admin routes - これらのルートは管理者のみアクセス可能
    const adminRoutes = [
      '/dashboard/admin',
      '/dashboard/notifications',
      '/dashboard/map',
      '/api/admin',
    ]
    
    if (adminRoutes.some((route) => pathname.startsWith(route))) {
      if (token?.role !== 'ADMIN') {
        // APIの場合は403を返す
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: '管理者権限が必要です' },
            { status: 403 }
          )
        }
        // ページの場合はダッシュボードにリダイレクト
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*', '/api/admin/:path*'],
}
