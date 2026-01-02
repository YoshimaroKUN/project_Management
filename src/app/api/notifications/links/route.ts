import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    const { notificationId, title, url } = await request.json()

    if (!notificationId || !title || !url) {
      return NextResponse.json(
        { error: 'お知らせID、タイトル、URLが必要です' },
        { status: 400 }
      )
    }

    // URLの簡易バリデーション
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: '有効なURLを入力してください' }, { status: 400 })
    }

    // お知らせの存在確認
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    })

    if (!notification) {
      return NextResponse.json({ error: 'お知らせが見つかりません' }, { status: 404 })
    }

    const link = await prisma.notificationLink.create({
      data: {
        notificationId,
        title,
        url,
      },
    })

    return NextResponse.json({
      message: 'リンクを追加しました',
      link,
    })
  } catch (error) {
    console.error('Link create error:', error)
    return NextResponse.json(
      { error: 'リンクの追加中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const linkId = searchParams.get('id')

    if (!linkId) {
      return NextResponse.json({ error: 'リンクIDが必要です' }, { status: 400 })
    }

    await prisma.notificationLink.delete({
      where: { id: linkId },
    })

    return NextResponse.json({ message: 'リンクを削除しました' })
  } catch (error) {
    console.error('Link delete error:', error)
    return NextResponse.json(
      { error: '削除中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
