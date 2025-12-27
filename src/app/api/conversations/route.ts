import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: 会話一覧を取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Get conversations error:', error)
    return NextResponse.json(
      { error: '会話一覧の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

// POST: 新しい会話を作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const conversation = await prisma.conversation.create({
      data: {
        userId: session.user.id,
        title: '新しい会話',
      },
    })

    return NextResponse.json({ conversation }, { status: 201 })
  } catch (error) {
    console.error('Create conversation error:', error)
    return NextResponse.json(
      { error: '会話の作成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

// DELETE: 会話を削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '会話IDが必要です' }, { status: 400 })
    }

    // Verify ownership
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!conversation) {
      return NextResponse.json({ error: '会話が見つかりません' }, { status: 404 })
    }

    await prisma.conversation.delete({ where: { id } })

    return NextResponse.json({ message: '会話を削除しました' })
  } catch (error) {
    console.error('Delete conversation error:', error)
    return NextResponse.json(
      { error: '会話の削除中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
