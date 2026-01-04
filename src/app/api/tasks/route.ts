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
    const status = searchParams.get('status')

    let whereClause: any = { userId: session.user.id }

    if (status && ['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      whereClause.status = status
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Get tasks error:', error)
    return NextResponse.json(
      { error: '課題の取得中にエラーが発生しました' },
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

    // Check if user is restricted
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isRestricted: true, restrictedFeatures: true }
    })
    if (user?.isRestricted && user?.restrictedFeatures?.includes('tasks')) {
      return NextResponse.json({ error: 'この機能は制限されています' }, { status: 403 })
    }

    const { title, description, priority, dueDate } = await request.json()

    if (!title) {
      return NextResponse.json({ error: 'タイトルは必須です' }, { status: 400 })
    }

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'PENDING',
        userId: session.user.id,
      },
    })

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json(
      { error: '課題の作成中にエラーが発生しました' },
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

    const { id, title, description, status, priority, dueDate } = await request.json()

    if (!id) {
      return NextResponse.json({ error: '課題IDが必要です' }, { status: 400 })
    }

    const existingTask = await prisma.task.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existingTask) {
      return NextResponse.json({ error: '課題が見つかりません' }, { status: 404 })
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: title || existingTask.title,
        description: description !== undefined ? description : existingTask.description,
        status: status || existingTask.status,
        priority: priority || existingTask.priority,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existingTask.dueDate,
      },
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Update task error:', error)
    return NextResponse.json(
      { error: '課題の更新中にエラーが発生しました' },
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '課題IDが必要です' }, { status: 400 })
    }

    const existingTask = await prisma.task.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existingTask) {
      return NextResponse.json({ error: '課題が見つかりません' }, { status: 404 })
    }

    await prisma.task.delete({ where: { id } })

    return NextResponse.json({ message: '課題を削除しました' })
  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json(
      { error: '課題の削除中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
