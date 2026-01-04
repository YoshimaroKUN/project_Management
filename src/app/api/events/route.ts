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
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    let whereClause: any = { userId: session.user.id }

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(month), 0)
      whereClause.startDate = {
        gte: startDate,
        lte: endDate,
      }
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      orderBy: { startDate: 'asc' },
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Get events error:', error)
    return NextResponse.json(
      { error: 'イベントの取得中にエラーが発生しました' },
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
    if (user?.isRestricted && user?.restrictedFeatures?.includes('calendar')) {
      return NextResponse.json({ error: 'この機能は制限されています' }, { status: 403 })
    }

    const { title, description, startDate, endDate, allDay, color } = await request.json()

    if (!title || !startDate) {
      return NextResponse.json(
        { error: 'タイトルと開始日は必須です' },
        { status: 400 }
      )
    }

    const event = await prisma.event.create({
      data: {
        title,
        description: description || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        allDay: allDay || false,
        color: color || '#3b82f6',
        userId: session.user.id,
      },
    })

    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    console.error('Create event error:', error)
    return NextResponse.json(
      { error: 'イベントの作成中にエラーが発生しました' },
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

    const { id, title, description, startDate, endDate, allDay, color } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'イベントIDが必要です' }, { status: 400 })
    }

    const existingEvent = await prisma.event.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'イベントが見つかりません' }, { status: 404 })
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        title: title || existingEvent.title,
        description: description !== undefined ? description : existingEvent.description,
        startDate: startDate ? new Date(startDate) : existingEvent.startDate,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : existingEvent.endDate,
        allDay: allDay !== undefined ? allDay : existingEvent.allDay,
        color: color || existingEvent.color,
      },
    })

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Update event error:', error)
    return NextResponse.json(
      { error: 'イベントの更新中にエラーが発生しました' },
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
      return NextResponse.json({ error: 'イベントIDが必要です' }, { status: 400 })
    }

    const existingEvent = await prisma.event.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'イベントが見つかりません' }, { status: 404 })
    }

    await prisma.event.delete({ where: { id } })

    return NextResponse.json({ message: 'イベントを削除しました' })
  } catch (error) {
    console.error('Delete event error:', error)
    return NextResponse.json(
      { error: 'イベントの削除中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
