import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // Get counts
    const [
      totalUsers,
      totalNotifications,
      totalMarkers,
      totalEvents,
      totalTasks,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.notification.count(),
      prisma.mapMarker.count(),
      prisma.event.count(),
      prisma.task.count(),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      }),
    ])

    return NextResponse.json({
      totalUsers,
      totalNotifications,
      totalMarkers,
      totalEvents,
      totalTasks,
      recentUsers,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: '統計情報の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
