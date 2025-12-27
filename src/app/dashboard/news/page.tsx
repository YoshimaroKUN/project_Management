'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Bell,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Check,
  BellRing,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
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

const typeConfig: { [key: string]: { icon: any; color: string; bgColor: string; label: string } } = {
  info: { icon: Info, color: 'text-blue-400', bgColor: 'bg-blue-500/10', label: '情報' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', label: '警告' },
  error: { icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-500/10', label: '緊急' },
  success: { icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-500/10', label: '完了' },
}

export default function NewsPage() {
  const { data: session, status } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if (status === 'authenticated') {
      fetchNotifications()
    }
    // ブラウザ通知の許可状態を確認
    if (typeof Notification !== 'undefined') {
      setNotificationPermission(Notification.permission)
    }
  }, [status])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications/user')
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

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/user?id=${id}`, {
        method: 'PATCH',
      })
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        )
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/user?all=true', {
        method: 'PATCH',
      })
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const requestNotificationPermission = async () => {
    if (typeof Notification !== 'undefined') {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      if (permission === 'granted') {
        new Notification('通知が有効になりました', {
          body: '新しいお知らせを受け取れるようになりました。',
          icon: '/avatars/default.png',
        })
      }
    }
  }

  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications

  const unreadCount = notifications.filter((n) => !n.isRead).length

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-glow">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">お知らせ</h1>
            <p className="text-sm text-gray-400">
              {unreadCount > 0 ? `${unreadCount}件の未読があります` : 'すべて既読です'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Browser Notification Toggle */}
          {typeof Notification !== 'undefined' && notificationPermission !== 'granted' && (
            <button
              onClick={requestNotificationPermission}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500/20 text-primary-400 rounded-xl hover:bg-primary-500/30 transition-all"
            >
              <BellRing className="w-4 h-4" />
              <span className="text-sm">通知を許可</span>
            </button>
          )}

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 text-gray-300 rounded-xl hover:bg-white/10 transition-all"
            >
              <Check className="w-4 h-4" />
              <span className="text-sm">すべて既読</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm transition-all ${
            filter === 'all'
              ? 'bg-primary-500 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          すべて ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-xl text-sm transition-all ${
            filter === 'unread'
              ? 'bg-primary-500 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          未読 ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {filter === 'unread' ? '未読のお知らせはありません' : 'お知らせはありません'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const config = typeConfig[notification.type] || typeConfig.info
            const Icon = config.icon

            return (
              <div
                key={notification.id}
                className={`glass-card rounded-2xl p-6 transition-all hover:bg-white/10 cursor-pointer ${
                  !notification.isRead ? 'border-l-4 border-l-primary-500' : ''
                }`}
                onClick={() => !notification.isRead && markAsRead(notification.id)}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${!notification.isRead ? 'text-white' : 'text-gray-300'}`}>
                        {notification.title}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                        {config.label}
                      </span>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-primary-500 rounded-full" />
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mb-2 whitespace-pre-wrap">
                      {notification.content}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                        locale: ja,
                      })}
                      {' · '}
                      {format(new Date(notification.createdAt), 'M月d日 HH:mm', { locale: ja })}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
