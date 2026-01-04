import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1'
const DIFY_API_KEY = process.env.DIFY_API_KEY || ''

// 質問から期間を解析する関数
function parseDateRange(query: string): { start: Date; end: Date; label: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // 来年
  if (query.includes('来年')) {
    const nextYear = now.getFullYear() + 1
    return {
      start: new Date(nextYear, 0, 1),
      end: new Date(nextYear, 11, 31, 23, 59, 59),
      label: `${nextYear}年`
    }
  }
  
  // 今年
  if (query.includes('今年')) {
    return {
      start: today,
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
      label: `${now.getFullYear()}年`
    }
  }
  
  // Xヶ月後
  const monthMatch = query.match(/(\d+)\s*[ヶか月ヵ]+\s*後/)
  if (monthMatch) {
    const months = parseInt(monthMatch[1])
    const futureDate = new Date(now)
    futureDate.setMonth(futureDate.getMonth() + months)
    return {
      start: today,
      end: futureDate,
      label: `今後${months}ヶ月`
    }
  }
  
  // 来月
  if (query.includes('来月')) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59)
    return {
      start: nextMonth,
      end: endOfNextMonth,
      label: `${nextMonth.getMonth() + 1}月`
    }
  }
  
  // 今月
  if (query.includes('今月')) {
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    return {
      start: today,
      end: endOfMonth,
      label: `${now.getMonth() + 1}月`
    }
  }
  
  // 来週
  if (query.includes('来週')) {
    const dayOfWeek = now.getDay()
    const daysUntilNextMonday = (8 - dayOfWeek) % 7 || 7
    const nextMonday = new Date(today)
    nextMonday.setDate(today.getDate() + daysUntilNextMonday)
    const nextSunday = new Date(nextMonday)
    nextSunday.setDate(nextMonday.getDate() + 6)
    nextSunday.setHours(23, 59, 59)
    return {
      start: nextMonday,
      end: nextSunday,
      label: '来週'
    }
  }
  
  // 今週
  if (query.includes('今週')) {
    const dayOfWeek = now.getDay()
    const daysUntilSunday = 7 - dayOfWeek
    const endOfWeek = new Date(today)
    endOfWeek.setDate(today.getDate() + daysUntilSunday)
    endOfWeek.setHours(23, 59, 59)
    return {
      start: today,
      end: endOfWeek,
      label: '今週'
    }
  }
  
  // 明日
  if (query.includes('明日')) {
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const endOfTomorrow = new Date(tomorrow)
    endOfTomorrow.setHours(23, 59, 59)
    return {
      start: tomorrow,
      end: endOfTomorrow,
      label: '明日'
    }
  }
  
  // 今日
  if (query.includes('今日')) {
    const endOfToday = new Date(today)
    endOfToday.setHours(23, 59, 59)
    return {
      start: today,
      end: endOfToday,
      label: '今日'
    }
  }
  
  // 特定の月（X月）
  const specificMonthMatch = query.match(/(\d{1,2})月/)
  if (specificMonthMatch) {
    const month = parseInt(specificMonthMatch[1]) - 1
    let year = now.getFullYear()
    // 過去の月が指定された場合は来年とみなす
    if (month < now.getMonth()) {
      year++
    }
    const startOfMonth = new Date(year, month, 1)
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)
    return {
      start: startOfMonth,
      end: endOfMonth,
      label: `${year}年${month + 1}月`
    }
  }
  
  // デフォルト: 今後1ヶ月
  const oneMonthLater = new Date(now)
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1)
  return {
    start: today,
    end: oneMonthLater,
    label: '今後1ヶ月'
  }
}

// Helper function to get user's tasks and events for context
async function getUserContext(userId: string, query: string) {
  const { start, end, label } = parseDateRange(query)
  
  console.log(`Date range for "${query}": ${start.toISOString()} to ${end.toISOString()} (${label})`)
  
  // Get tasks in the date range
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: { not: 'COMPLETED' },
      dueDate: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { dueDate: 'asc' },
    take: 20,
  })

  // Get events in the date range
  const events = await prisma.event.findMany({
    where: {
      userId,
      startDate: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { startDate: 'asc' },
    take: 20,
  })

  // Format context string
  let context = ''
  
  if (tasks.length > 0) {
    context += `【${label}の課題】\n`
    for (const task of tasks) {
      const dueDate = task.dueDate 
        ? new Date(task.dueDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
        : '期限なし'
      const priority = task.priority === 'HIGH' ? '🔴高' : task.priority === 'MEDIUM' ? '🟡中' : '🟢低'
      context += `- ${task.title}（期限: ${dueDate}, 優先度: ${priority}）\n`
    }
    context += '\n'
  } else {
    context += `【${label}の課題】\n登録されている課題はありません。\n\n`
  }

  if (events.length > 0) {
    context += `【${label}の予定】\n`
    for (const event of events) {
      const eventDate = new Date(event.startDate).toLocaleDateString('ja-JP', { 
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' 
      })
      const time = event.allDay ? '終日' : new Date(event.startDate).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      context += `- ${event.title}（${eventDate} ${time}）\n`
    }
  } else {
    context += `【${label}の予定】\n登録されている予定はありません。\n`
  }

  return context
}

// 追加リクエストを検出して処理する関数
interface AddRequest {
  type: 'task' | 'event' | null
  title: string
  date: Date | null
  priority?: 'HIGH' | 'MEDIUM' | 'LOW'
  allDay?: boolean
}

function parseAddRequest(query: string): AddRequest | null {
  // 追加キーワードの検出
  const addKeywords = ['追加', '登録', '入れて', 'いれて', '作って', 'つくって', '設定', 'セット', '予約']
  const hasAddKeyword = addKeywords.some(k => query.includes(k))
  
  if (!hasAddKeyword) return null
  
  // 課題か予定かを判定
  const isTask = query.includes('課題') || query.includes('タスク') || query.includes('宿題') || query.includes('レポート') || query.includes('提出')
  const isEvent = query.includes('予定') || query.includes('イベント') || query.includes('スケジュール') || query.includes('カレンダー') || query.includes('会議') || query.includes('授業')
  
  if (!isTask && !isEvent) return null
  
  const now = new Date()
  let targetDate: Date | null = null
  
  // 日付を解析
  // 「X月Y日」形式
  const monthDayMatch = query.match(/(\d{1,2})月\s*(\d{1,2})日/)
  if (monthDayMatch) {
    const month = parseInt(monthDayMatch[1]) - 1
    const day = parseInt(monthDayMatch[2])
    let year = now.getFullYear()
    // 過去の日付は来年とみなす
    const tempDate = new Date(year, month, day)
    if (tempDate < now) {
      year++
    }
    targetDate = new Date(year, month, day, 9, 0, 0)
  }
  
  // 「明日」
  if (query.includes('明日')) {
    targetDate = new Date(now)
    targetDate.setDate(now.getDate() + 1)
    targetDate.setHours(9, 0, 0, 0)
  }
  
  // 「明後日」
  if (query.includes('明後日') || query.includes('あさって')) {
    targetDate = new Date(now)
    targetDate.setDate(now.getDate() + 2)
    targetDate.setHours(9, 0, 0, 0)
  }
  
  // 「来週」
  if (query.includes('来週')) {
    const dayOfWeek = now.getDay()
    const daysUntilNextMonday = (8 - dayOfWeek) % 7 || 7
    targetDate = new Date(now)
    targetDate.setDate(now.getDate() + daysUntilNextMonday)
    targetDate.setHours(9, 0, 0, 0)
  }
  
  // 「今週」
  if (query.includes('今週') && !targetDate) {
    targetDate = new Date(now)
    targetDate.setDate(now.getDate() + 3) // 今週の中頃
    targetDate.setHours(9, 0, 0, 0)
  }
  
  // 「X日後」
  const daysLaterMatch = query.match(/(\d+)日後/)
  if (daysLaterMatch) {
    const days = parseInt(daysLaterMatch[1])
    targetDate = new Date(now)
    targetDate.setDate(now.getDate() + days)
    targetDate.setHours(9, 0, 0, 0)
  }
  
  // 時刻解析
  const timeMatch = query.match(/(\d{1,2})[時:](\d{0,2})分?/)
  if (timeMatch && targetDate) {
    const hour = parseInt(timeMatch[1])
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    targetDate.setHours(hour, minute, 0, 0)
  }
  
  // 優先度解析
  let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'
  if (query.includes('重要') || query.includes('急ぎ') || query.includes('緊急') || query.includes('高優先')) {
    priority = 'HIGH'
  } else if (query.includes('低優先') || query.includes('余裕')) {
    priority = 'LOW'
  }
  
  // タイトルを抽出（「〜を追加」「〜の予定」などから）
  let title = ''
  
  // 「」や『』で囲まれた部分を探す
  const quotedMatch = query.match(/[「『](.+?)[」』]/)
  if (quotedMatch) {
    title = quotedMatch[1]
  } else {
    // 「〜を追加」「〜を登録」パターン
    const titleMatch = query.match(/[「『]?(.+?)[」』]?(?:を|の)\s*(?:課題|タスク|予定|イベント|スケジュール)/)
    if (titleMatch) {
      title = titleMatch[1].trim()
    }
    
    // それでも見つからない場合、キーワードを除去して残りをタイトルに
    if (!title) {
      title = query
        .replace(/課題|タスク|予定|イベント|スケジュール|カレンダー|宿題|レポート|会議|授業/g, '')
        .replace(/追加|登録|入れて|いれて|作って|つくって|設定|セット|予約/g, '')
        .replace(/して|しておいて|お願い|ください/g, '')
        .replace(/明日|明後日|来週|今週|\d+月\d+日|\d+日後/g, '')
        .replace(/重要|急ぎ|緊急|高優先|低優先|余裕/g, '')
        .replace(/[\s　]+/g, ' ')
        .trim()
    }
  }
  
  // タイトルが空または短すぎる場合
  if (!title || title.length < 2) {
    title = isTask ? '新しい課題' : '新しい予定'
  }
  
  return {
    type: isTask ? 'task' : 'event',
    title,
    date: targetDate,
    priority: isTask ? priority : undefined,
    allDay: !timeMatch,
  }
}

// 課題を追加する関数
async function addTask(userId: string, title: string, dueDate: Date | null, priority: 'HIGH' | 'MEDIUM' | 'LOW') {
  const task = await prisma.task.create({
    data: {
      title,
      userId,
      dueDate,
      priority,
      status: 'TODO',
    },
  })
  return task
}

// 予定を追加する関数
async function addEvent(userId: string, title: string, startDate: Date, allDay: boolean) {
  const endDate = new Date(startDate)
  if (allDay) {
    endDate.setHours(23, 59, 59)
  } else {
    endDate.setHours(startDate.getHours() + 1) // デフォルト1時間
  }
  
  const event = await prisma.event.create({
    data: {
      title,
      userId,
      startDate,
      endDate,
      allDay,
    },
  })
  return event
}

// Helper function to get notifications for explicit request (keyword detection only)
async function getNotificationsContext(query: string) {
  const notifications = await prisma.notification.findMany({
    where: { isGlobal: true },
    include: {
      attachments: true,
      links: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  if (notifications.length === 0) return 'お知らせはありません。'

  // ユーザーの質問に関連するキーワードを抽出
  const queryLower = query.toLowerCase()
  
  let context = '【お知らせ一覧】\n'
  let totalLength = 0
  const MAX_CONTEXT_LENGTH = 2500 // Difyの制限より少し余裕を持たせる
  
  for (const notif of notifications) {
    const typeLabel = notif.type === 'error' ? '🚨緊急' : notif.type === 'warning' ? '⚠️警告' : notif.type === 'success' ? '✅完了' : 'ℹ️情報'
    const date = new Date(notif.createdAt).toLocaleDateString('ja-JP')
    
    let notifContext = `\n━━━ ${typeLabel} [${date}] ${notif.title} ━━━\n`
    notifContext += `${notif.content}\n`
    
    // 添付ファイルの内容があれば追加（質問に関連する場合は優先）
    if (notif.attachments && notif.attachments.length > 0) {
      for (const attachment of notif.attachments) {
        if (attachment.textContent) {
          // 質問に関連するお知らせ/添付の場合は内容を含める
          const isRelevant = notif.title.toLowerCase().includes(queryLower) ||
            notif.content.toLowerCase().includes(queryLower) ||
            attachment.filename.toLowerCase().includes(queryLower) ||
            queryLower.includes('奨学') || queryLower.includes('pdf') || 
            queryLower.includes('添付') || queryLower.includes('書類')
          
          if (isRelevant) {
            // 関連する場合は内容を含める（ただし制限あり）
            const maxAttachmentLength = Math.min(attachment.textContent.length, 1500)
            notifContext += `\n【添付: ${attachment.filename}】\n${attachment.textContent.slice(0, maxAttachmentLength)}\n`
            if (attachment.textContent.length > maxAttachmentLength) {
              notifContext += '...(省略)\n'
            }
          } else {
            notifContext += `📎 添付ファイル: ${attachment.filename}（詳細は「${attachment.filename}について教えて」と聞いてください）\n`
          }
        } else {
          notifContext += `📎 添付ファイル: ${attachment.filename}\n`
        }
      }
    }
    
    // リンクがあれば追加
    if (notif.links && notif.links.length > 0) {
      notifContext += `🔗 参考リンク: ${notif.links.map(l => l.title).join(', ')}\n`
    }
    
    // 文字数制限チェック
    if (totalLength + notifContext.length > MAX_CONTEXT_LENGTH) {
      context += '\n...(他のお知らせは省略されました)\n'
      break
    }
    
    context += notifContext
    totalLength += notifContext.length
  }
  
  return context
}

// Helper function to get map location context
async function getMapContext(query: string) {
  // Search for matching locations
  const markers = await prisma.mapMarker.findMany({
    orderBy: { createdAt: 'desc' },
  })

  if (markers.length === 0) return { context: '', markers: [] }

  // Find relevant markers based on query
  const queryLower = query.toLowerCase()
  const relevantMarkers = markers.filter(m => 
    m.title.toLowerCase().includes(queryLower) ||
    m.description?.toLowerCase().includes(queryLower) ||
    m.building?.toLowerCase().includes(queryLower) ||
    m.category?.toLowerCase().includes(queryLower)
  )

  // If specific location found, return detailed info
  if (relevantMarkers.length > 0 && relevantMarkers.length <= 3) {
    let context = '【場所情報】\n'
    for (const marker of relevantMarkers) {
      context += `📍 ${marker.title}\n`
      if (marker.building) context += `  建物: ${marker.building}\n`
      if (marker.floor) context += `  階数: ${marker.floor}\n`
      if (marker.description) context += `  説明: ${marker.description}\n`
      if (marker.directions) context += `  🚶行き方: ${marker.directions}\n`
      if (marker.nearbyInfo) context += `  目印: ${marker.nearbyInfo}\n`
      context += '\n'
    }
    return { context, markers: relevantMarkers }
  }

  // If asking about locations in general, list all
  const locationKeywords = ['場所', '施設', 'どこ', '行き方', '行きたい', 'マップ', '地図', '案内']
  if (locationKeywords.some(k => query.includes(k))) {
    let context = '【学内施設一覧】\n'
    for (const marker of markers.slice(0, 10)) {
      context += `- ${marker.title}`
      if (marker.building) context += ` (${marker.building})`
      context += '\n'
    }
    context += '\n※ 詳しい行き方を知りたい場合は、具体的な場所名を教えてください。\n'
    return { context, markers: [] }
  }

  return { context: '', markers: [] }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('Session:', JSON.stringify(session, null, 2))
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { message, conversationId } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'メッセージが必要です' }, { status: 400 })
    }

    // Verify user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })
    console.log('User in DB:', dbUser ? 'Found' : 'NOT FOUND', 'ID:', session.user.id)
    
    if (!dbUser) {
      return NextResponse.json({ error: 'ユーザーが見つかりません。再ログインしてください。' }, { status: 401 })
    }

    // Get or create conversation
    let conversation
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: session.user.id },
      })
    }
    
    if (!conversation) {
      // Create new conversation with first message as title
      const title = message.length > 30 ? message.substring(0, 30) + '...' : message
      conversation = await prisma.conversation.create({
        data: {
          userId: session.user.id,
          title,
        },
      })
    }

    // Save user message to database
    await prisma.chatMessage.create({
      data: {
        content: message,
        role: 'user',
        conversationId: conversation.id,
      },
    })

    // 追加リクエストを検出して処理
    const addRequest = parseAddRequest(message)
    let addedItem: { type: string; title: string; date: string | null } | null = null
    
    if (addRequest && addRequest.type) {
      try {
        if (addRequest.type === 'task') {
          const task = await addTask(
            session.user.id,
            addRequest.title,
            addRequest.date,
            addRequest.priority || 'MEDIUM'
          )
          const dateStr = addRequest.date 
            ? addRequest.date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
            : null
          addedItem = { type: '課題', title: task.title, date: dateStr }
          console.log('Task added:', task)
        } else if (addRequest.type === 'event') {
          // 日付がない場合は追加しない
          if (addRequest.date) {
            const event = await addEvent(
              session.user.id,
              addRequest.title,
              addRequest.date,
              addRequest.allDay ?? true
            )
            const dateStr = addRequest.date.toLocaleDateString('ja-JP', { 
              year: 'numeric', month: 'long', day: 'numeric',
              ...(addRequest.allDay ? {} : { hour: '2-digit', minute: '2-digit' })
            })
            addedItem = { type: '予定', title: event.title, date: dateStr }
            console.log('Event added:', event)
          }
        }
      } catch (addError) {
        console.error('Failed to add item:', addError)
      }
    }

    // Build context based on message content
    let fullContext = ''
    
    // 追加した項目があればコンテキストに含める
    if (addedItem) {
      fullContext += `【追加完了】\n${addedItem.type}「${addedItem.title}」を${addedItem.date ? `${addedItem.date}に` : ''}追加しました。\n\n`
    }
    
    // 1. ユーザーの課題・予定を取得（質問に応じた期間）
    const userContext = await getUserContext(session.user.id, message)
    if (userContext) fullContext += userContext + '\n'

    // 2. Check for notification related keywords (only when explicitly asked)
    const notificationKeywords = ['お知らせ', '通知', 'ニュース', '連絡', '告知', '情報', '奨学', 'pdf', '書類', '添付']
    if (notificationKeywords.some(keyword => message.includes(keyword))) {
      const notifContext = await getNotificationsContext(message)
      if (notifContext) fullContext += notifContext + '\n'
    }

    // 3. Check for location/map related keywords
    let matchedMarkers: any[] = []
    const locationKeywords = ['どこ', '場所', '行き方', '行きたい', 'マップ', '地図', '施設', '教室', '棟', '建物', '館', '案内', 'への']
    if (locationKeywords.some(keyword => message.includes(keyword))) {
      const mapResult = await getMapContext(message)
      if (mapResult.context) fullContext += mapResult.context
      matchedMarkers = mapResult.markers
    } else {
      // 場所キーワードがなくても、マーカー名がメッセージに含まれているかチェック
      const mapResult = await getMapContext(message)
      if (mapResult.markers.length > 0) {
        fullContext += mapResult.context
        matchedMarkers = mapResult.markers
      }
    }

    console.log('Context included:', fullContext ? 'Yes' : 'No')
    if (fullContext) console.log('Context preview:', fullContext.substring(0, 200) + '...')

    // ナレッジベース検索のため、queryには元のメッセージのみを使用
    // コンテキスト情報はinputsのuser_contextで渡す（Difyのプロンプトで参照）

    // Log for debugging
    console.log('Dify API URL:', `${DIFY_API_URL}/chat-messages`)
    console.log('Dify API Key (first 10 chars):', DIFY_API_KEY.substring(0, 10) + '...')
    console.log('Query:', message)
    console.log('User context length:', fullContext?.length || 0)

    // Build request body - conversation_id should be omitted if empty
    const requestBody: Record<string, unknown> = {
      inputs: {
        name: session.user.name || 'ユーザー',
        user_context: fullContext || 'なし',
      },
      query: message,  // 元のメッセージをそのまま送信（ナレッジベース検索用）
      response_mode: 'blocking',
      user: session.user.id,
    }

    // Only include conversation_id if it exists
    if (conversation.difyConversationId) {
      requestBody.conversation_id = conversation.difyConversationId
    }

    console.log('Request body keys:', Object.keys(requestBody))

    // Call Dify API
    const difyResponse = await fetch(`${DIFY_API_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    console.log('Dify Response Status:', difyResponse.status)

    if (!difyResponse.ok) {
      // Log the error details
      const errorText = await difyResponse.text()
      console.error('Dify API Error:', difyResponse.status, errorText)
      
      // If Dify API fails, return a fallback response with error details
      const fallbackMessage = `AIアシスタントに接続できませんでした。(エラー: ${difyResponse.status})`
      
      await prisma.chatMessage.create({
        data: {
          content: fallbackMessage,
          role: 'assistant',
          conversationId: conversation.id,
        },
      })

      return NextResponse.json({
        answer: fallbackMessage,
        conversation_id: conversation.id,
      })
    }

    const difyData = await difyResponse.json()

    // Update conversation with Dify's conversation ID
    if (difyData.conversation_id && !conversation.difyConversationId) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { difyConversationId: difyData.conversation_id },
      })
    }

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    })

    // Save assistant message to database with markers
    await prisma.chatMessage.create({
      data: {
        content: difyData.answer || 'No response',
        role: 'assistant',
        conversationId: conversation.id,
        markers: matchedMarkers.length > 0 ? JSON.stringify(matchedMarkers) : null,
      },
    })

    return NextResponse.json({
      answer: difyData.answer,
      conversation_id: conversation.id,
      markers: matchedMarkers.map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        latitude: m.latitude,
        longitude: m.longitude,
        category: m.category,
        building: m.building,
        floor: m.floor,
        directions: m.directions,
      })),
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'チャット処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json({ messages: [] })
    }

    // Verify ownership
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: session.user.id },
    })

    if (!conversation) {
      return NextResponse.json({ error: '会話が見つかりません' }, { status: 404 })
    }

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    })

    // Parse markers from JSON string
    const messagesWithMarkers = messages.map(m => ({
      ...m,
      markers: m.markers ? JSON.parse(m.markers) : [],
    }))

    return NextResponse.json({ messages: messagesWithMarkers })
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json(
      { error: 'メッセージの取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
