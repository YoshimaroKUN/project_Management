import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '対応している画像形式: JPEG, PNG, GIF, WebP' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'ファイルサイズは5MB以下にしてください' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'avatars')
    await mkdir(uploadsDir, { recursive: true })

    // Generate unique filename
    const ext = file.name.split('.').pop()
    const filename = `${session.user.id}-${Date.now()}.${ext}`
    const filepath = join(uploadsDir, filename)

    // Save file
    await writeFile(filepath, buffer)

    // Update user avatar in database
    const avatarUrl = `/uploads/avatars/${filename}`
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatar: avatarUrl },
    })

    return NextResponse.json({ 
      message: 'アバターをアップロードしました',
      avatarUrl,
    })
  } catch (error) {
    console.error('Upload avatar error:', error)
    return NextResponse.json(
      { error: 'アバターのアップロード中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
