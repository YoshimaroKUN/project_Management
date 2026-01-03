import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1'
const DIFY_API_KEY = process.env.DIFY_API_KEY || ''

// Helper function to get user's tasks and events for context
async function getUserContext(userId: string) {
  const now = new Date()
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  
  // Get upcoming tasks
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: { not: 'COMPLETED' },
      dueDate: {
        gte: now,
        lte: oneWeekLater,
      },
    },
    orderBy: { dueDate: 'asc' },
    take: 10,
  })

  // Get upcoming events
  const events = await prisma.event.findMany({
    where: {
      userId,
      startDate: {
        gte: now,
        lte: oneWeekLater,
      },
    },
    orderBy: { startDate: 'asc' },
    take: 10,
  })

  // Format context string
  let context = ''
  
  if (tasks.length > 0) {
    context += '【今後の課題】\n'
    for (const task of tasks) {
      const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('ja-JP') : '期限なし'
      const priority = task.priority === 'HIGH' ? '🔴高' : task.priority === 'MEDIUM' ? '🟡中' : '🟢低'
      context += `- ${task.title}（期限: ${dueDate}, 優先度: ${priority}）\n`
    }
    context += '\n'
  }

  if (events.length > 0) {
    context += '【今後の予定】\n'
    for (const event of events) {
      const eventDate = new Date(event.startDate).toLocaleDateString('ja-JP')
      const time = event.allDay ? '終日' : new Date(event.startDate).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      context += `- ${event.title}（${eventDate} ${time}）\n`
    }
  }

  return context
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

    // Build context based on message content
    let fullContext = ''
    
    // 1. Check for schedule/task related keywords
    const scheduleKeywords = ['予定', '課題', 'タスク', 'スケジュール', '今日', '明日', '今週', 'やること', '締め切り', '期限']
    if (scheduleKeywords.some(keyword => message.includes(keyword))) {
      const userContext = await getUserContext(session.user.id)
      if (userContext) fullContext += userContext + '\n'
    }

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
    }

    console.log('Context included:', fullContext ? 'Yes' : 'No')
    if (fullContext) console.log('Context preview:', fullContext.substring(0, 200) + '...')

    // Prepare the query with context
    const queryWithContext = fullContext 
      ? `以下は参考情報です：\n${fullContext}\n\nユーザーの質問: ${message}`
      : message

    // Log for debugging
    console.log('Dify API URL:', `${DIFY_API_URL}/chat-messages`)
    console.log('Dify API Key (first 10 chars):', DIFY_API_KEY.substring(0, 10) + '...')

    // Call Dify API
    const difyResponse = await fetch(`${DIFY_API_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          name: session.user.name || 'ユーザー',
          user_context: fullContext,
        },
        query: queryWithContext,
        response_mode: 'blocking',
        conversation_id: conversation.difyConversationId || '',
        user: session.user.id,
      }),
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
