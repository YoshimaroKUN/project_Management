'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Send, Sparkles, User, Plus, Trash2, MapPin, Navigation, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/map/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] bg-white/5 rounded-xl flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
    </div>
  ),
})

interface MapMarker {
  id: string
  title: string
  description: string | null
  latitude: number
  longitude: number
  category: string | null
  building?: string | null
  floor?: string | null
  directions?: string | null
}

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  createdAt: string
  markers?: MapMarker[]
}

interface Conversation {
  id: string
  title: string
  updatedAt: string
  messages: { content: string }[]
}

export default function ChatPage() {
  const { data: session } = useSession()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    if (currentConversationId) {
      fetchMessages(currentConversationId)
    } else {
      setMessages([])
    }
  }, [currentConversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations')
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat?conversationId=${conversationId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const createNewConversation = () => {
    setCurrentConversationId(null)
    setMessages([])
    inputRef.current?.focus()
  }

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const response = await fetch(`/api/conversations?id=${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id))
        if (currentConversationId === id) {
          setCurrentConversationId(null)
          setMessages([])
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    // Optimistically add user message
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      content: userMessage,
      role: 'user',
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMessage])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationId: currentConversationId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // If this was a new conversation, set the ID and refresh list
        if (!currentConversationId && data.conversation_id) {
          setCurrentConversationId(data.conversation_id)
        }
        
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          content: data.answer,
          role: 'assistant',
          createdAt: new Date().toISOString(),
          markers: data.markers || [],
        }
        setMessages((prev) => [...prev, assistantMessage])
        
        // Refresh conversation list to update timestamps
        fetchConversations()
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex animate-fade-in relative">
      {/* Sidebar - Conversation List */}
      <div
        className={`${
          sidebarOpen ? 'w-72' : 'w-0'
        } transition-all duration-300 overflow-hidden flex-shrink-0`}
      >
        <div className="w-72 h-full glass-card mr-4 flex flex-col">
          {/* Header with close button */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">チャット履歴</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-white/10 rounded-lg transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          
          {/* New Chat Button */}
          <div className="p-4 border-b border-white/10">
            <button
              onClick={createNewConversation}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              新しいチャット
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                会話履歴がありません
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setCurrentConversationId(conversation.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all group ${
                      currentConversationId === conversation.id
                        ? 'bg-primary-500/20 text-white'
                        : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 flex-shrink-0 text-primary-400" />
                          <p className="font-medium truncate text-sm">{conversation.title}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(conversation.updatedAt), {
                            addSuffix: true,
                            locale: ja,
                          })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteConversation(conversation.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Toggle Sidebar Button */}
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 bg-dark-card border border-white/10 rounded-lg hover:bg-white/10 transition-all"
              >
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            )}
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AIアシスタント</h1>
              <p className="text-xs text-gray-400">Dify powered AI Chat</p>
            </div>
          </div>
        </div>

        {/* Chat container */}
        <div className="flex-1 glass-card flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles className="w-10 h-10 text-primary-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  AIアシスタントへようこそ
                </h2>
                <p className="text-gray-400 max-w-md">
                  何でも質問してください。学習のサポート、課題のヘルプ、
                  施設への行き方など、お手伝いします。
                </p>
                <div className="mt-4 p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                  <p className="text-sm text-primary-300">
                    💡 予定・課題・お知らせ・施設の場所について質問できます。場所を聞くとマップも表示されます！
                  </p>
                </div>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    '今週の予定を教えて',
                    '締め切りが近い課題は？',
                    '図書館はどこ？',
                    'お知らせを教えて',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="px-4 py-2 text-sm text-gray-300 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 message-enter ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden relative ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                      : 'bg-gradient-to-br from-purple-500 to-pink-500'
                  }`}
                >
                  {message.role === 'user' ? (
                    <>
                      {session?.user?.avatar && (
                        <Image
                          src={session.user.avatar}
                          alt="アバター"
                          fill
                          className="object-cover"
                          unoptimized
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      )}
                      <User className="w-5 h-5 text-white absolute" />
                    </>
                  ) : (
                    <Sparkles className="w-5 h-5 text-white" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-2xl'
                      : ''
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="space-y-3">
                      <div className="bg-white/10 text-white px-4 py-3 rounded-2xl">
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                      
                      {/* Map display for location responses */}
                      {message.markers && message.markers.length > 0 && (
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                          <div className="flex items-center gap-2 mb-3">
                            <MapPin className="w-4 h-4 text-primary-400" />
                            <span className="text-sm font-medium text-white">場所を表示</span>
                          </div>
                          <div className="rounded-xl overflow-hidden mb-3">
                            <MapComponent
                              markers={message.markers.map(m => ({
                                id: m.id,
                                title: m.title,
                                description: m.description,
                                latitude: m.latitude,
                                longitude: m.longitude,
                                category: m.category,
                              }))}
                            />
                          </div>
                          {/* Location details */}
                          <div className="space-y-2">
                            {message.markers.map((marker) => (
                              <div key={marker.id} className="p-3 bg-white/5 rounded-xl">
                                <div className="flex items-center gap-2 mb-1">
                                  <MapPin className="w-4 h-4 text-primary-400" />
                                  <span className="font-medium text-white">{marker.title}</span>
                                  {marker.building && (
                                    <span className="text-xs text-gray-400">({marker.building})</span>
                                  )}
                                </div>
                                {marker.floor && (
                                  <p className="text-sm text-gray-400 ml-6">階数: {marker.floor}</p>
                                )}
                                {marker.directions && (
                                  <div className="mt-2 ml-6 p-2 bg-primary-500/10 rounded-lg flex items-start gap-2">
                                    <Navigation className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-gray-300">{marker.directions}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white/10 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-white/50 rounded-full typing-dot" />
                    <div className="w-2 h-2 bg-white/50 rounded-full typing-dot" />
                    <div className="w-2 h-2 bg-white/50 rounded-full typing-dot" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="メッセージを入力... (Shift+Enterで改行)"
                className="flex-1 input-modern resize-none min-h-[52px] max-h-32"
                rows={1}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
