import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'

// MIMEタイプのマッピング
const mimeTypes: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // パスを結合
    const filePath = params.path.join('/')
    
    // セキュリティチェック: パストラバーサル防止
    if (filePath.includes('..') || filePath.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    // 許可されたディレクトリのみ
    const allowedPrefixes = ['uploads/attachments/', 'uploads/avatars/']
    const isAllowed = allowedPrefixes.some(prefix => filePath.startsWith(prefix))
    
    if (!isAllowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // ファイルパスを構築
    const fullPath = join(process.cwd(), 'public', filePath)

    // ファイルの存在確認
    try {
      await stat(fullPath)
    } catch {
      console.error('File not found:', fullPath)
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // ファイルを読み込み
    const fileBuffer = await readFile(fullPath)

    // 拡張子からMIMEタイプを取得
    const ext = '.' + (filePath.split('.').pop()?.toLowerCase() || '')
    const contentType = mimeTypes[ext] || 'application/octet-stream'

    // ファイル名を取得
    const filename = filePath.split('/').pop() || 'download'

    // レスポンスを返す
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error) {
    console.error('File serve error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
