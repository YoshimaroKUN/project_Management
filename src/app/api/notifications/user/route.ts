import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: ユーザー向けのお知らせ一覧を取得（グローバル + 個人宛）
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // グローバル通知と個人宛通知を取得
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { userId: session.user.id },
        ],
      },
      include: {
        readBy: {
          where: { userId: session.user.id },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // isReadをユーザーごとに計算
    const notificationsWithReadStatus = notifications.map(notif => ({
      id: notif.id,
      title: notif.title,
      content: notif.content,
      type: notif.type,
      isGlobal: notif.isGlobal,
      createdAt: notif.createdAt,
      isRead: notif.readBy.length > 0, // このユーザーが既読にしたか
    }))

    return NextResponse.json({ notifications: notificationsWithReadStatus })
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// PATCH: お知らせを既読にする
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const all = searchParams.get('all')

    if (all === 'true') {
      // すべての通知を既読にする
      const notifications = await prisma.notification.findMany({
        where: {
          OR: [
            { isGlobal: true },
            { userId: session.user.id },
          ],
        },
        select: { id: true },
      })

      // 各通知に対して既読レコードを作成（既にある場合はスキップ）
      for (const notif of notifications) {
        await prisma.notificationRead.upsert({
          where: {
            notificationId_userId: {
              notificationId: notif.id,
              userId: session.user.id,
            },
          },
          create: {
            notificationId: notif.id,
            userId: session.user.id,
          },
          update: {},
        })
      }

      return NextResponse.json({ success: true })
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    // 特定の通知を既読にする
    await prisma.notificationRead.upsert({
      where: {
        notificationId_userId: {
          notificationId: id,
          userId: session.user.id,
        },
      },
      create: {
        notificationId: id,
        userId: session.user.id,
      },
      update: {},
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to mark as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark as read' },
      { status: 500 }
    )
  }
}
