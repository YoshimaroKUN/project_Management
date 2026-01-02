import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeAttachments = searchParams.get('includeAttachments') === 'true'

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { isGlobal: true },
        ],
      },
      include: includeAttachments ? {
        attachments: true,
        links: true,
      } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json(
      { error: '通知の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // Only admin can create global notifications
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const { title, content, type, isGlobal } = await request.json()

    if (!title || !content) {
      return NextResponse.json(
        { error: 'タイトルと内容は必須です' },
        { status: 400 }
      )
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        content,
        type: type || 'info',
        isGlobal: isGlobal || false,
        userId: isGlobal ? null : session.user.id,
      },
    })

    return NextResponse.json({ notification }, { status: 201 })
  } catch (error) {
    console.error('Create notification error:', error)
    return NextResponse.json(
      { error: '通知の作成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // Only admin can update notifications
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const { id, title, content, type } = await request.json()

    if (!id) {
      return NextResponse.json({ error: '通知IDが必要です' }, { status: 400 })
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { 
        ...(title && { title }),
        ...(content && { content }),
        ...(type && { type }),
      },
    })

    return NextResponse.json({ notification })
  } catch (error) {
    console.error('Update notification error:', error)
    return NextResponse.json(
      { error: '通知の更新中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // Only admin can delete notifications
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '通知IDが必要です' }, { status: 400 })
    }

    await prisma.notification.delete({ where: { id } })

    return NextResponse.json({ message: '通知を削除しました' })
  } catch (error) {
    console.error('Delete notification error:', error)
    return NextResponse.json(
      { error: '通知の削除中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
