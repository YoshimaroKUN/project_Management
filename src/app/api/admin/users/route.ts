import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// GET: ユーザー一覧取得（管理者のみ）
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isRestricted: true,
        restrictedFeatures: true,
        restrictionReason: true,
        createdAt: true,
        _count: {
          select: {
            events: true,
            tasks: true,
            conversations: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json({ error: 'ユーザー一覧の取得に失敗しました' }, { status: 500 })
  }
}

// PUT: ユーザー制限の更新（管理者のみ）
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const { userId, isRestricted, restrictedFeatures, restrictionReason } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'ユーザーIDが必要です' }, { status: 400 })
    }

    // 自分自身を制限できないようにする
    if (userId === session.user.id) {
      return NextResponse.json({ error: '自分自身を制限することはできません' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isRestricted,
        restrictedFeatures: restrictedFeatures || null,
        restrictionReason: restrictionReason || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isRestricted: true,
        restrictedFeatures: true,
        restrictionReason: true,
      }
    })

    return NextResponse.json({ user, message: isRestricted ? 'ユーザーを制限しました' : '制限を解除しました' })
  } catch (error) {
    console.error('Failed to update user restriction:', error)
    return NextResponse.json({ error: 'ユーザー制限の更新に失敗しました' }, { status: 500 })
  }
}

// DELETE: ユーザー削除（管理者のみ）
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const adminPassword = searchParams.get('password')

    if (!userId || !adminPassword) {
      return NextResponse.json({ error: 'ユーザーIDと管理者パスワードが必要です' }, { status: 400 })
    }

    // 自分自身を削除できないようにする
    if (userId === session.user.id) {
      return NextResponse.json({ error: '自分自身を削除することはできません' }, { status: 400 })
    }

    // 管理者パスワードの確認
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!admin) {
      return NextResponse.json({ error: '管理者が見つかりません' }, { status: 404 })
    }

    const isValidPassword = await bcrypt.compare(adminPassword, admin.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: 'パスワードが正しくありません' }, { status: 401 })
    }

    // ユーザー削除（関連データはCascadeで自動削除）
    await prisma.user.delete({
      where: { id: userId },
    })

    return NextResponse.json({ message: 'ユーザーを削除しました' })
  } catch (error) {
    console.error('Failed to delete user:', error)
    return NextResponse.json({ error: 'ユーザーの削除に失敗しました' }, { status: 500 })
  }
}
