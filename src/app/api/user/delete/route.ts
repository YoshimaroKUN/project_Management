import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import fs from 'fs/promises'
import path from 'path'

// DELETE: 自分のアカウントを削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { password, confirmed } = await request.json()

    if (!password || !confirmed) {
      return NextResponse.json({ error: 'パスワードと確認が必要です' }, { status: 400 })
    }

    // パスワードの確認
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: 'パスワードが正しくありません' }, { status: 401 })
    }

    // アバター画像の削除
    if (user.avatar) {
      try {
        const avatarPath = path.join(process.cwd(), 'public', user.avatar)
        await fs.unlink(avatarPath)
      } catch (e) {
        console.error('Failed to delete avatar:', e)
      }
    }

    // ユーザー削除（関連データはCascadeで自動削除）
    await prisma.user.delete({
      where: { id: session.user.id },
    })

    return NextResponse.json({ message: 'アカウントを削除しました' })
  } catch (error) {
    console.error('Failed to delete account:', error)
    return NextResponse.json({ error: 'アカウントの削除に失敗しました' }, { status: 500 })
  }
}
