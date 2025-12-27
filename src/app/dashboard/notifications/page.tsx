'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
  Bell,
  Plus,
  X,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Trash2,
  Send,
} from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Notification {
  id: string
  title: string
  content: string
  type: string
  isRead: boolean
  isGlobal: boolean
  createdAt: string
}

const typeOptions = [
  { value: 'info', label: '情報', icon: Info, color: 'text-blue-400 bg-blue-500/10' },
  { value: 'warning', label: '警告', icon: AlertTriangle, color: 'text-yellow-400 bg-yellow-500/10' },
  { value: 'error', label: 'エラー', icon: AlertCircle, color: 'text-red-400 bg-red-500/10' },
  { value: 'success', label: '成功', icon: CheckCircle, color: 'text-green-400 bg-green-500/10' },
]

export default function NotificationsPage() {
  const { data: session, status } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState('info')
  const [isGlobal, setIsGlobal] = useState(true)

  // Check if user is admin
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      redirect('/dashboard')
    }
  }, [session, status])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchNotifications()
    }
  }, [status])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, type, isGlobal }),
      })
      if (response.ok) {
        await fetchNotifications()
        setTitle('')
        setContent('')
        setType('info')
        setIsGlobal(true)
        setShowModal(false)
      }
    } catch (error) {
      console.error('Failed to create notification:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await fetchNotifications()
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const getTypeInfo = (typeValue: string) => {
    return typeOptions.find((t) => t.value === typeValue) || typeOptions[0]
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-glow">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">お知らせ管理</h1>
            <p className="text-sm text-gray-400">全ユーザーへのお知らせを管理</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          お知らせを作成
        </button>
      </div>

      {/* Admin badge */}
      <div className="glass-card p-4 mb-6 border-l-4 border-purple-500">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-lg">
            管理者専用
          </span>
          <span className="text-gray-400 text-sm">
            このページは管理者のみアクセス可能です
          </span>
        </div>
      </div>

      {/* Notifications list */}
      <div className="space-y-3">
        {loading ? (
          <div className="glass-card p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Bell className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">お知らせがありません</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const typeInfo = getTypeInfo(notification.type)
            const TypeIcon = typeInfo.icon

            return (
              <div
                key={notification.id}
                className="glass-card p-4 card-hover group"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-xl ${typeInfo.color}`}>
                    <TypeIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-white">{notification.title}</h3>
                      {notification.isGlobal && (
                        <span className="px-2 py-0.5 bg-primary-500/20 text-primary-400 text-xs rounded-lg">
                          全体
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{notification.content}</p>
                    <span className="text-xs text-gray-500">
                      {format(new Date(notification.createdAt), 'yyyy年M月d日 HH:mm', { locale: ja })}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">新しいお知らせ</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">
                  タイトル
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-modern"
                  placeholder="お知らせのタイトル"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">
                  内容
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="input-modern resize-none"
                  placeholder="お知らせの内容"
                  rows={4}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  タイプ
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {typeOptions.map((option) => {
                    const OptionIcon = option.icon
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setType(option.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                          type === option.value
                            ? option.color
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        <OptionIcon className="w-4 h-4" />
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isGlobal"
                  checked={isGlobal}
                  onChange={(e) => setIsGlobal(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="isGlobal" className="text-sm text-gray-300">
                  全ユーザーに表示
                </label>
              </div>

              <button type="submit" className="w-full btn-primary flex items-center justify-center gap-2 mt-6">
                <Send className="w-4 h-4" />
                送信
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
