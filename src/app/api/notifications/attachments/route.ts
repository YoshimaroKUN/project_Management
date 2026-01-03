import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { uploadToDify, deleteFromDify, isDifyConfigured } from '@/lib/dify'

// PDFからテキストを抽出する関数
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // pdf-parseを動的にインポート（Dockerビルド対応）
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    
    // テキストを取得（最大20000文字）
    const text = data.text || ''
    console.log(`PDF extracted: ${text.length} characters`)
    return text.slice(0, 20000)
  } catch (e) {
    console.error('PDF text extraction error:', e)
    
    // フォールバック: 簡易抽出を試みる
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const notificationId = formData.get('notificationId') as string | null
    const uploadToDifyFlag = formData.get('uploadToDify') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 })
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'お知らせIDが必要です' }, { status: 400 })
    }

    // ファイルタイプの検証（MIMEタイプと拡張子の両方で判定）
    const validMimeTypes = [
      'application/pdf',
      'application/x-pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ]
    
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.txt']
    const fileExt = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
    
    const isValidMime = validMimeTypes.includes(file.type)
    const isValidExt = validExtensions.includes(fileExt)
    
    // デバッグ用ログ
    console.log('File upload:', { name: file.name, type: file.type, ext: fileExt, isValidMime, isValidExt })
    
    if (!isValidMime && !isValidExt) {
      return NextResponse.json(
        { error: `対応しているファイル形式: PDF, 画像, Word, Excel, テキスト (受信: ${file.type})` },
        { status: 400 }
      )
    }

    // ファイルサイズ制限（最大10MB）
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'ファイルサイズは10MB以下にしてください' },
        { status: 400 }
      )
    }

    // お知らせの存在確認
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    })

    if (!notification) {
      return NextResponse.json({ error: 'お知らせが見つかりません' }, { status: 404 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // アップロードディレクトリを作成
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'attachments')
    await mkdir(uploadsDir, { recursive: true })

    // ユニークなファイル名を生成
    const ext = file.name.split('.').pop()
    const filename = `${notificationId}-${Date.now()}.${ext}`
    const filepath = join(uploadsDir, filename)

    // ファイルを保存
    await writeFile(filepath, buffer)

    // ファイルの種類に応じてテキストを抽出
    let textContent = ''
    const isPDF = file.type === 'application/pdf' || file.type === 'application/x-pdf' || fileExt === '.pdf'
    const isText = file.type === 'text/plain' || fileExt === '.txt'
    
    if (isPDF) {
      textContent = await extractTextFromPDF(buffer)
      console.log(`PDF text extracted: ${textContent.length} chars from ${file.name}`)
    } else if (isText) {
      // テキストファイルはそのまま読み込み
      textContent = buffer.toString('utf-8').slice(0, 20000)
      console.log(`Text file read: ${textContent.length} chars from ${file.name}`)
    }

    // データベースに保存
    const attachment = await prisma.notificationAttachment.create({
      data: {
        notificationId,
        filename: file.name,
        filepath: `/uploads/attachments/${filename}`,
        mimetype: file.type,
        size: file.size,
        textContent,
      },
    })

    // Difyにアップロードする場合
    let difyDocumentId: string | null = null
    if (uploadToDifyFlag && isDifyConfigured()) {
      try {
        // Dify対応ファイル形式をチェック（TXT, Markdown, PDF, HTML, XLSX, XLS, DOCX, CSV）
        const difySupported = ['.txt', '.md', '.pdf', '.html', '.xlsx', '.xls', '.docx', '.csv']
        if (difySupported.includes(fileExt)) {
          difyDocumentId = await uploadToDify(buffer, file.name)
          
          if (difyDocumentId) {
            // difyDocumentIdをDBに保存
            await prisma.notificationAttachment.update({
              where: { id: attachment.id },
              data: { difyDocumentId },
            })
            console.log(`Dify upload success: ${file.name} -> ${difyDocumentId}`)
          }
        } else {
          console.log(`File type ${fileExt} not supported by Dify, skipping upload`)
        }
      } catch (difyError) {
        console.error('Dify upload failed (non-fatal):', difyError)
        // Difyアップロード失敗はエラーにしない（ローカル保存は成功）
      }
    }

    return NextResponse.json({
      message: 'ファイルをアップロードしました',
      attachment: {
        ...attachment,
        difyDocumentId,
      },
      difyUploaded: !!difyDocumentId,
    })
  } catch (error) {
    console.error('Attachment upload error:', error)
    return NextResponse.json(
      { error: 'ファイルのアップロード中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 添付ファイルの削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const attachmentId = searchParams.get('id')

    if (!attachmentId) {
      return NextResponse.json({ error: '添付ファイルIDが必要です' }, { status: 400 })
    }

    // 削除前にDify Document IDを取得
    const attachment = await prisma.notificationAttachment.findUnique({
      where: { id: attachmentId },
    })

    if (!attachment) {
      return NextResponse.json({ error: '添付ファイルが見つかりません' }, { status: 404 })
    }

    // DifyからドキュメントがあればDifyからも削除
    if (attachment.difyDocumentId && isDifyConfigured()) {
      try {
        const deleted = await deleteFromDify(attachment.difyDocumentId)
        if (deleted) {
          console.log(`Deleted from Dify: ${attachment.difyDocumentId}`)
        }
      } catch (difyError) {
        console.error('Dify delete failed (non-fatal):', difyError)
        // Dify削除失敗はエラーにしない
      }
    }

    await prisma.notificationAttachment.delete({
      where: { id: attachmentId },
    })

    return NextResponse.json({ message: '添付ファイルを削除しました' })
  } catch (error) {
    console.error('Attachment delete error:', error)
    return NextResponse.json(
      { error: '削除中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
