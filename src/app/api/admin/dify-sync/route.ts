import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'

// Dify Knowledge Base API設定
const DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1'
const DIFY_DATASET_API_KEY = process.env.DIFY_DATASET_API_KEY || '' // データセット用APIキー
const DIFY_DATASET_ID = process.env.DIFY_DATASET_ID || '' // ナレッジベースID

// Difyにドキュメントをアップロード
async function uploadToDify(filename: string, buffer: Buffer, mimeType: string): Promise<{ success: boolean; documentId?: string; error?: string }> {
  if (!DIFY_DATASET_API_KEY || !DIFY_DATASET_ID) {
    return { success: false, error: 'Dify設定が不足しています（DIFY_DATASET_API_KEY, DIFY_DATASET_ID）' }
  }

  try {
    // FormDataを作成
    const formData = new FormData()
    
    // ファイルをBlobとして追加
    const blob = new Blob([buffer], { type: mimeType })
    formData.append('file', blob, filename)
    
    // メタデータを追加
    const data = JSON.stringify({
      indexing_technique: 'high_quality',
      process_rule: {
        mode: 'automatic'
      }
    })
    formData.append('data', data)

    const response = await fetch(
      `${DIFY_API_URL.replace('/v1', '')}/v1/datasets/${DIFY_DATASET_ID}/document/create-by-file`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DIFY_DATASET_API_KEY}`,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Dify upload error:', response.status, errorText)
      return { success: false, error: `Dify API error: ${response.status}` }
    }

    const result = await response.json()
    console.log('Dify upload success:', result)
    
    return { 
      success: true, 
      documentId: result.document?.id 
    }
  } catch (error) {
    console.error('Dify upload exception:', error)
    return { success: false, error: String(error) }
  }
}

// 添付ファイルをDifyにアップロード
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // 設定確認
    if (!DIFY_DATASET_API_KEY || !DIFY_DATASET_ID) {
      return NextResponse.json({ 
        error: 'Dify連携が設定されていません。.envにDIFY_DATASET_API_KEYとDIFY_DATASET_IDを設定してください。',
        setupRequired: true,
      }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const attachmentId = searchParams.get('attachmentId')
    const uploadAll = searchParams.get('all') === 'true'

    const results = []

    if (uploadAll) {
      // すべてのPDF添付ファイルをアップロード
      const attachments = await prisma.notificationAttachment.findMany({
        where: {
          OR: [
            { mimetype: { contains: 'pdf' } },
            { filename: { endsWith: '.pdf' } },
          ],
          difyDocumentId: null, // まだアップロードされていないもの
        },
        include: {
          notification: true,
        },
      })

      for (const attachment of attachments) {
        try {
          const filePath = join(process.cwd(), 'public', attachment.filepath)
          const buffer = await readFile(filePath)
          
          const uploadResult = await uploadToDify(
            attachment.filename,
            buffer,
            attachment.mimetype
          )

          if (uploadResult.success && uploadResult.documentId) {
            await prisma.notificationAttachment.update({
              where: { id: attachment.id },
              data: { difyDocumentId: uploadResult.documentId },
            })
          }

          results.push({
            id: attachment.id,
            filename: attachment.filename,
            ...uploadResult,
          })
        } catch (error) {
          results.push({
            id: attachment.id,
            filename: attachment.filename,
            success: false,
            error: String(error),
          })
        }
      }
    } else if (attachmentId) {
      // 指定されたファイルのみアップロード
      const attachment = await prisma.notificationAttachment.findUnique({
        where: { id: attachmentId },
      })

      if (!attachment) {
        return NextResponse.json({ error: '添付ファイルが見つかりません' }, { status: 404 })
      }

      const filePath = join(process.cwd(), 'public', attachment.filepath)
      const buffer = await readFile(filePath)
      
      const uploadResult = await uploadToDify(
        attachment.filename,
        buffer,
        attachment.mimetype
      )

      if (uploadResult.success && uploadResult.documentId) {
        await prisma.notificationAttachment.update({
          where: { id: attachment.id },
          data: { difyDocumentId: uploadResult.documentId },
        })
      }

      results.push({
        id: attachment.id,
        filename: attachment.filename,
        ...uploadResult,
      })
    } else {
      return NextResponse.json({ error: 'attachmentIdまたはall=trueを指定してください' }, { status: 400 })
    }

    const successCount = results.filter(r => r.success).length
    return NextResponse.json({
      message: `${successCount}/${results.length} ファイルをDifyにアップロードしました`,
      results,
    })
  } catch (error) {
    console.error('Dify sync error:', error)
    return NextResponse.json(
      { error: 'Dify連携中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

// Dify連携状態を確認
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    const isConfigured = !!(DIFY_DATASET_API_KEY && DIFY_DATASET_ID)

    const attachments = await prisma.notificationAttachment.findMany({
      where: {
        OR: [
          { mimetype: { contains: 'pdf' } },
          { filename: { endsWith: '.pdf' } },
        ],
      },
      select: {
        id: true,
        filename: true,
        difyDocumentId: true,
        notification: {
          select: { title: true },
        },
      },
    })

    return NextResponse.json({
      isConfigured,
      datasetId: DIFY_DATASET_ID ? `...${DIFY_DATASET_ID.slice(-8)}` : null,
      attachments: attachments.map(a => ({
        id: a.id,
        filename: a.filename,
        notificationTitle: a.notification?.title,
        uploadedToDify: !!a.difyDocumentId,
      })),
      stats: {
        total: attachments.length,
        uploaded: attachments.filter(a => a.difyDocumentId).length,
        pending: attachments.filter(a => !a.difyDocumentId).length,
      },
    })
  } catch (error) {
    console.error('Dify status error:', error)
    return NextResponse.json(
      { error: 'ステータス取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
