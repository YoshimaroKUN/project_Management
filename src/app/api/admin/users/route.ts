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

    // 対象ユーザーの確認
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    }

    // 対象が管理者の場合、最後の管理者かチェック
    if (targetUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' },
      })
      if (adminCount <= 1) {
        return NextResponse.json({ error: '最後の管理者は削除できません' }, { status: 400 })
      }
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

// POST: ユーザーロール変更（管理者のみ）
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const { userId, role, password } = await request.json()

    if (!userId || !role || !password) {
      return NextResponse.json({ error: 'ユーザーID、ロール、パスワードが必要です' }, { status: 400 })
    }

    if (!['ADMIN', 'USER'].includes(role)) {
      return NextResponse.json({ error: '無効なロールです' }, { status: 400 })
    }

    // 自分自身のロールは変更できない
    if (userId === session.user.id) {
      return NextResponse.json({ error: '自分自身のロールは変更できません' }, { status: 400 })
    }

    // 対象ユーザーの確認
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    }

    // 管理者を降格する場合、最後の管理者かチェック
    if (targetUser.role === 'ADMIN' && role === 'USER') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' },
      })
      if (adminCount <= 1) {
        return NextResponse.json({ error: '最後の管理者を降格することはできません' }, { status: 400 })
      }
    }

    // 管理者パスワードの確認
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!admin) {
      return NextResponse.json({ error: '管理者が見つかりません' }, { status: 404 })
    }

    const isValidPassword = await bcrypt.compare(password, admin.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: 'パスワードが正しくありません' }, { status: 401 })
    }

    // ロール更新
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    const message = role === 'ADMIN' ? '管理者に昇格しました' : '一般ユーザーに降格しました'
    return NextResponse.json({ user: updatedUser, message })
  } catch (error) {
    console.error('Failed to change user role:', error)
    return NextResponse.json({ error: 'ロールの変更に失敗しました' }, { status: 500 })
  }
}
