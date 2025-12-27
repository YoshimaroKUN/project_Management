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

    const markers = await prisma.mapMarker.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ markers })
  } catch (error) {
    console.error('Get markers error:', error)
    return NextResponse.json(
      { error: 'マーカーの取得中にエラーが発生しました' },
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

    // Only admin can create markers
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const { title, description, directions, floor, building, nearbyInfo, latitude, longitude, category } = await request.json()

    if (!title || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'タイトル、緯度、経度は必須です' },
        { status: 400 }
      )
    }

    const marker = await prisma.mapMarker.create({
      data: {
        title,
        description: description || null,
        directions: directions || null,
        floor: floor || null,
        building: building || null,
        nearbyInfo: nearbyInfo || null,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        category: category || null,
      },
    })

    return NextResponse.json({ marker }, { status: 201 })
  } catch (error) {
    console.error('Create marker error:', error)
    return NextResponse.json(
      { error: 'マーカーの作成中にエラーが発生しました' },
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

    // Only admin can update markers
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const { id, title, description, directions, floor, building, nearbyInfo, latitude, longitude, category } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'マーカーIDが必要です' }, { status: 400 })
    }

    const existingMarker = await prisma.mapMarker.findUnique({ where: { id } })

    if (!existingMarker) {
      return NextResponse.json({ error: 'マーカーが見つかりません' }, { status: 404 })
    }

    const marker = await prisma.mapMarker.update({
      where: { id },
      data: {
        title: title || existingMarker.title,
        description: description !== undefined ? description : existingMarker.description,
        directions: directions !== undefined ? directions : existingMarker.directions,
        floor: floor !== undefined ? floor : existingMarker.floor,
        building: building !== undefined ? building : existingMarker.building,
        nearbyInfo: nearbyInfo !== undefined ? nearbyInfo : existingMarker.nearbyInfo,
        latitude: latitude !== undefined ? parseFloat(latitude) : existingMarker.latitude,
        longitude: longitude !== undefined ? parseFloat(longitude) : existingMarker.longitude,
        category: category !== undefined ? category : existingMarker.category,
      },
    })

    return NextResponse.json({ marker })
  } catch (error) {
    console.error('Update marker error:', error)
    return NextResponse.json(
      { error: 'マーカーの更新中にエラーが発生しました' },
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

    // Only admin can delete markers
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'マーカーIDが必要です' }, { status: 400 })
    }

    await prisma.mapMarker.delete({ where: { id } })

    return NextResponse.json({ message: 'マーカーを削除しました' })
  } catch (error) {
    console.error('Delete marker error:', error)
    return NextResponse.json(
      { error: 'マーカーの削除中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
