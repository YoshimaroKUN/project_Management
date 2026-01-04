import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import fs from 'fs/promises'
import path from 'path'

// DELETE: データベースの完全削除（管理者のみ）
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const { password, target, confirmed } = await request.json()

    if (!password || !target || !confirmed) {
      return NextResponse.json({ error: 'パスワード、対象、確認が必要です' }, { status: 400 })
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

    let deletedCount = 0

    switch (target) {
      case 'all-users':
        // 管理者以外の全ユーザーを削除
        const result = await prisma.user.deleteMany({
          where: {
            role: { not: 'ADMIN' }
          }
        })
        deletedCount = result.count
        break

      case 'all-notifications':
        // 全お知らせと添付ファイルを削除
        const attachments = await prisma.notificationAttachment.findMany()
        for (const attachment of attachments) {
          try {
            const filePath = path.join(process.cwd(), 'public', attachment.filepath)
            await fs.unlink(filePath)
          } catch (e) {
            console.error('Failed to delete file:', e)
          }
        }
        await prisma.notificationAttachment.deleteMany()
        await prisma.notificationLink.deleteMany()
        await prisma.notificationRead.deleteMany()
        const notifResult = await prisma.notification.deleteMany()
        deletedCount = notifResult.count
        break

      case 'all-events':
        // 全予定を削除
        const eventResult = await prisma.event.deleteMany()
        deletedCount = eventResult.count
        break

      case 'all-tasks':
        // 全課題を削除
        const taskResult = await prisma.task.deleteMany()
        deletedCount = taskResult.count
        break

      case 'all-conversations':
        // 全会話履歴を削除
        await prisma.chatMessage.deleteMany()
        const convResult = await prisma.conversation.deleteMany()
        deletedCount = convResult.count
        break

      case 'all-markers':
        // 全マップマーカーを削除
        const markerResult = await prisma.mapMarker.deleteMany()
        deletedCount = markerResult.count
        break

      case 'reset-database':
        // データベース全体をリセット（管理者アカウントを除く全データ削除）
        // 添付ファイルの削除
        const allAttachments = await prisma.notificationAttachment.findMany()
        for (const attachment of allAttachments) {
          try {
            const filePath = path.join(process.cwd(), 'public', attachment.filepath)
            await fs.unlink(filePath)
          } catch (e) {
            console.error('Failed to delete file:', e)
          }
        }
        
        // アバター画像の削除
        const users = await prisma.user.findMany({
          where: { role: { not: 'ADMIN' } }
        })
        for (const user of users) {
          if (user.avatar) {
            try {
              const avatarPath = path.join(process.cwd(), 'public', user.avatar)
              await fs.unlink(avatarPath)
            } catch (e) {
              console.error('Failed to delete avatar:', e)
            }
          }
        }

        // 全データ削除（順序重要）
        await prisma.chatMessage.deleteMany()
        await prisma.conversation.deleteMany()
        await prisma.notificationAttachment.deleteMany()
        await prisma.notificationLink.deleteMany()
        await prisma.notificationRead.deleteMany()
        await prisma.notification.deleteMany()
        await prisma.event.deleteMany()
        await prisma.task.deleteMany()
        await prisma.mapMarker.deleteMany()
        await prisma.user.deleteMany({
          where: { role: { not: 'ADMIN' } }
        })
        deletedCount = -1 // 全削除を示す
        break

      default:
        return NextResponse.json({ error: '不明な対象です' }, { status: 400 })
    }

    const messages: Record<string, string> = {
      'all-users': `${deletedCount}人のユーザーを削除しました`,
      'all-notifications': `${deletedCount}件のお知らせを削除しました`,
      'all-events': `${deletedCount}件の予定を削除しました`,
      'all-tasks': `${deletedCount}件の課題を削除しました`,
      'all-conversations': `${deletedCount}件の会話を削除しました`,
      'all-markers': `${deletedCount}件のマーカーを削除しました`,
      'reset-database': 'データベースをリセットしました',
    }

    return NextResponse.json({ 
      message: messages[target] || '削除が完了しました',
      deletedCount 
    })
  } catch (error) {
    console.error('Failed to perform database operation:', error)
    return NextResponse.json({ error: 'データベース操作に失敗しました' }, { status: 500 })
  }
}
