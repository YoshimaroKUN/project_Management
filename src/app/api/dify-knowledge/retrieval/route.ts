import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Dify External Knowledge API
// Difyからの検索リクエストを受けて、アプリのデータを返す

// 認証用のシークレットキー（環境変数から取得）
const DIFY_KNOWLEDGE_SECRET = process.env.DIFY_KNOWLEDGE_SECRET || 'your-secret-key'

interface ExternalKnowledgeRequest {
  knowledge_id: string
  query: string
  retrieval_setting: {
    top_k: number
    score_threshold: number
  }
}

interface RetrievalResult {
  content: string
  score: number
  title: string
  metadata?: Record<string, any>
}

export async function POST(request: NextRequest) {
  try {
    // 認証ヘッダーの確認
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || authHeader !== `Bearer ${DIFY_KNOWLEDGE_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ExternalKnowledgeRequest = await request.json()
    const { query, retrieval_setting } = body
    const topK = retrieval_setting?.top_k || 5

    console.log('Dify Knowledge API called:', { query, topK })

    const queryLower = query.toLowerCase()
    const results: RetrievalResult[] = []

    // 1. 課題情報を検索
    const taskKeywords = ['課題', 'タスク', 'やること', '宿題', 'レポート', '提出', '締め切り', '期限']
    if (taskKeywords.some(k => queryLower.includes(k)) || queryLower.includes('task')) {
      const tasks = await prisma.task.findMany({
        where: {
          status: { not: 'COMPLETED' },
        },
        orderBy: { dueDate: 'asc' },
        take: topK,
      })

      if (tasks.length > 0) {
        let content = '【登録されている課題一覧】\n\n'
        for (const task of tasks) {
          const dueDate = task.dueDate 
            ? new Date(task.dueDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
            : '期限なし'
          const priority = task.priority === 'HIGH' ? '🔴高' : task.priority === 'MEDIUM' ? '🟡中' : '🟢低'
          const status = task.status === 'IN_PROGRESS' ? '作業中' : '未着手'
          content += `📝 ${task.title}\n`
          content += `   期限: ${dueDate}\n`
          content += `   優先度: ${priority}\n`
          content += `   状態: ${status}\n`
          if (task.description) content += `   詳細: ${task.description}\n`
          content += '\n'
        }
        results.push({
          content,
          score: 0.95,
          title: '課題情報',
          metadata: { type: 'tasks', count: tasks.length }
        })
      } else {
        results.push({
          content: '現在登録されている課題はありません。',
          score: 0.9,
          title: '課題情報',
          metadata: { type: 'tasks', count: 0 }
        })
      }
    }

    // 2. カレンダー・予定情報を検索
    const eventKeywords = ['予定', 'スケジュール', 'カレンダー', 'イベント', '今日', '明日', '今週', '来週']
    if (eventKeywords.some(k => queryLower.includes(k)) || queryLower.includes('event') || queryLower.includes('schedule')) {
      const now = new Date()
      const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      
      const events = await prisma.event.findMany({
        where: {
          startDate: {
            gte: now,
            lte: twoWeeksLater,
          },
        },
        orderBy: { startDate: 'asc' },
        take: topK,
      })

      if (events.length > 0) {
        let content = '【今後2週間の予定】\n\n'
        for (const event of events) {
          const date = new Date(event.startDate).toLocaleDateString('ja-JP', { 
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' 
          })
          const time = event.allDay 
            ? '終日' 
            : new Date(event.startDate).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
          content += `📅 ${event.title}\n`
          content += `   日時: ${date} ${time}\n`
          if (event.location) content += `   場所: ${event.location}\n`
          if (event.description) content += `   詳細: ${event.description}\n`
          content += '\n'
        }
        results.push({
          content,
          score: 0.95,
          title: 'カレンダー・予定情報',
          metadata: { type: 'events', count: events.length }
        })
      } else {
        results.push({
          content: '今後2週間に登録されている予定はありません。',
          score: 0.9,
          title: 'カレンダー・予定情報',
          metadata: { type: 'events', count: 0 }
        })
      }
    }

    // 3. 学内マップ・施設情報を検索
    const mapKeywords = ['どこ', '場所', '行き方', 'マップ', '地図', '施設', '教室', '棟', '建物', '館', '案内']
    if (mapKeywords.some(k => queryLower.includes(k))) {
      const markers = await prisma.mapMarker.findMany({
        orderBy: { createdAt: 'desc' },
      })

      // クエリに関連するマーカーを検索
      const relevantMarkers = markers.filter(m => 
        queryLower.includes(m.title.toLowerCase()) ||
        m.title.toLowerCase().includes(queryLower.replace(/どこ|場所|行き方|教えて/g, '').trim()) ||
        m.description?.toLowerCase().includes(queryLower) ||
        m.building?.toLowerCase().includes(queryLower) ||
        m.category?.toLowerCase().includes(queryLower)
      )

      if (relevantMarkers.length > 0) {
        let content = '【場所情報】\n\n'
        for (const marker of relevantMarkers.slice(0, topK)) {
          content += `📍 ${marker.title}\n`
          if (marker.building) content += `   建物: ${marker.building}\n`
          if (marker.floor) content += `   階数: ${marker.floor}\n`
          if (marker.description) content += `   説明: ${marker.description}\n`
          if (marker.directions) content += `   🚶行き方: ${marker.directions}\n`
          if (marker.nearbyInfo) content += `   目印: ${marker.nearbyInfo}\n`
          content += '\n'
        }
        results.push({
          content,
          score: 0.95,
          title: '施設・場所情報',
          metadata: { type: 'map', count: relevantMarkers.length }
        })
      } else if (markers.length > 0) {
        // 特定の場所が見つからない場合は一覧を返す
        let content = '【学内施設一覧】\n\n'
        content += '以下の施設が登録されています：\n'
        for (const marker of markers.slice(0, 10)) {
          content += `- ${marker.title}`
          if (marker.building) content += ` (${marker.building})`
          content += '\n'
        }
        content += '\n※ 具体的な場所名を教えていただければ、詳しい行き方をご案内します。\n'
        results.push({
          content,
          score: 0.7,
          title: '施設一覧',
          metadata: { type: 'map', count: markers.length }
        })
      }
    }

    // 4. お知らせ情報を検索
    const notifKeywords = ['お知らせ', '通知', 'ニュース', '連絡', '告知', '情報']
    if (notifKeywords.some(k => queryLower.includes(k))) {
      const notifications = await prisma.notification.findMany({
        where: { isGlobal: true },
        include: { attachments: true, links: true },
        orderBy: { createdAt: 'desc' },
        take: topK,
      })

      if (notifications.length > 0) {
        let content = '【最新のお知らせ】\n\n'
        for (const notif of notifications) {
          const typeLabel = notif.type === 'error' ? '🚨緊急' : 
                           notif.type === 'warning' ? '⚠️警告' : 
                           notif.type === 'success' ? '✅完了' : 'ℹ️情報'
          const date = new Date(notif.createdAt).toLocaleDateString('ja-JP')
          content += `${typeLabel} [${date}] ${notif.title}\n`
          content += `${notif.content}\n`
          if (notif.attachments?.length) {
            content += `📎 添付: ${notif.attachments.map(a => a.filename).join(', ')}\n`
          }
          content += '\n'
        }
        results.push({
          content,
          score: 0.9,
          title: 'お知らせ情報',
          metadata: { type: 'notifications', count: notifications.length }
        })
      }
    }

    // 結果がない場合
    if (results.length === 0) {
      // 一般的な情報を返す
      const [taskCount, eventCount, markerCount, notifCount] = await Promise.all([
        prisma.task.count({ where: { status: { not: 'COMPLETED' } } }),
        prisma.event.count(),
        prisma.mapMarker.count(),
        prisma.notification.count({ where: { isGlobal: true } }),
      ])

      results.push({
        content: `このシステムには以下の情報が登録されています：
- 未完了の課題: ${taskCount}件
- 予定: ${eventCount}件
- 施設情報: ${markerCount}件
- お知らせ: ${notifCount}件

具体的な質問（例：「今週の予定は？」「図書館はどこ？」）をしていただければ、詳しくお答えします。`,
        score: 0.5,
        title: 'システム情報',
        metadata: { type: 'general' }
      })
    }

    console.log('Returning results:', results.length)

    // Dify External Knowledge API の形式で返す
    return NextResponse.json({
      records: results.map(r => ({
        content: r.content,
        score: r.score,
        title: r.title,
        metadata: r.metadata,
      }))
    })

  } catch (error) {
    console.error('Dify Knowledge API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GETリクエストでヘルスチェック
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Dify External Knowledge API is running',
    endpoints: {
      search: 'POST /api/dify-knowledge',
    }
  })
}
