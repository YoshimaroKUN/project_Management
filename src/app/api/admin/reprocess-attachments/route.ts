import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'

// PDFからテキストを抽出する関数
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    const text = data.text || ''
    console.log(`PDF extracted: ${text.length} characters`)
    return text.slice(0, 20000)
  } catch (e) {
    console.error('PDF text extraction error:', e)
    // フォールバック
    try {
      const text = buffer.toString('utf-8')
      const matches = text.match(/[\x20-\x7E\u3000-\u9FFF\uFF00-\uFFEF]+/g)
      if (matches) {
        return matches.join(' ').slice(0, 10000)
      }
    } catch (fallbackError) {
      console.error('Fallback extraction failed:', fallbackError)
    }
  }
  return ''
}

// 既存の添付ファイルのテキストを再抽出
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // textContentが空の添付ファイルを取得
    const attachments = await prisma.notificationAttachment.findMany({
      where: {
        OR: [
          { textContent: null },
          { textContent: '' },
        ],
        mimetype: {
          in: ['application/pdf', 'application/x-pdf', 'text/plain'],
        },
      },
    })

    console.log(`Found ${attachments.length} attachments to reprocess`)

    const results = []

    for (const attachment of attachments) {
      try {
        // ファイルを読み込み
        const filePath = join(process.cwd(), 'public', attachment.filepath)
        const buffer = await readFile(filePath)
        
        let textContent = ''
        
        if (attachment.mimetype.includes('pdf')) {
          textContent = await extractTextFromPDF(buffer)
        } else if (attachment.mimetype === 'text/plain') {
          textContent = buffer.toString('utf-8').slice(0, 20000)
        }

        if (textContent) {
          await prisma.notificationAttachment.update({
            where: { id: attachment.id },
            data: { textContent },
          })
          
          results.push({
            id: attachment.id,
            filename: attachment.filename,
            status: 'success',
            textLength: textContent.length,
          })
        } else {
          results.push({
            id: attachment.id,
            filename: attachment.filename,
            status: 'no_text',
          })
        }
      } catch (error) {
        console.error(`Error processing ${attachment.filename}:`, error)
        results.push({
          id: attachment.id,
          filename: attachment.filename,
          status: 'error',
          error: String(error),
        })
      }
    }

    return NextResponse.json({
      message: `${results.filter(r => r.status === 'success').length}/${attachments.length} ファイルを処理しました`,
      results,
    })
  } catch (error) {
    console.error('Reprocess error:', error)
    return NextResponse.json(
      { error: '再処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 添付ファイルのテキスト内容を確認
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    const attachments = await prisma.notificationAttachment.findMany({
      select: {
        id: true,
        filename: true,
        mimetype: true,
        textContent: true,
        notification: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      attachments: attachments.map(a => ({
        id: a.id,
        filename: a.filename,
        mimetype: a.mimetype,
        notificationTitle: a.notification?.title,
        hasTextContent: !!a.textContent,
        textContentLength: a.textContent?.length || 0,
        textPreview: a.textContent?.slice(0, 200) || null,
      })),
    })
  } catch (error) {
    console.error('Get attachments error:', error)
    return NextResponse.json(
      { error: '取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
