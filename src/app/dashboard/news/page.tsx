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
  Paperclip,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  File,
  X,
  Download,
  Calendar,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

// ファイルパスをAPIルート経由に変換
const getFileUrl = (filepath: string) => `/api/files${filepath}`

interface Attachment {
  id: string
  filename: string
  filepath: string
  mimetype: string
  size: number
}

interface NotificationLink {
  id: string
  title: string
  url: string
}

interface Notification {
  id: string
  title: string
  content: string
  type: string
  isRead: boolean
  isGlobal: boolean
  createdAt: string
  attachments?: Attachment[]
  links?: NotificationLink[]
}

const typeConfig: { [key: string]: { icon: any; color: string; bgColor: string; label: string; borderColor: string } } = {
  info: { icon: Info, color: 'text-blue-400', bgColor: 'bg-blue-500/10', label: '情報', borderColor: 'border-blue-500' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', label: '警告', borderColor: 'border-yellow-500' },
  error: { icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-500/10', label: '緊急', borderColor: 'border-red-500' },
  success: { icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-500/10', label: '完了', borderColor: 'border-green-500' },
}

export default function NewsPage() {
  const { data: session, status } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchNotifications()
    }
    if (typeof Notification !== 'undefined') {
      setNotificationPermission(Notification.permission)
    }
  }, [status])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications/user?includeAttachments=true')
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

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return ImageIcon
    if (mimetype === 'application/pdf') return FileText
    return File
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
        if (selectedNotification?.id === id) {
          setSelectedNotification({ ...selectedNotification, isRead: true })
        }
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

  const openNotification = (notification: Notification) => {
    setSelectedNotification(notification)
    if (!notification.isRead) {
      markAsRead(notification.id)
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-glow">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">お知らせ</h1>
            <p className="text-xs sm:text-sm text-gray-400">
              {unreadCount > 0 ? `${unreadCount}件の未読があります` : 'すべて既読です'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {typeof Notification !== 'undefined' && notificationPermission !== 'granted' && (
            <button
              onClick={requestNotificationPermission}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary-500/20 text-primary-400 rounded-xl hover:bg-primary-500/30 transition-all"
            >
              <BellRing className="w-4 h-4" />
              <span className="text-xs sm:text-sm hidden sm:inline">通知を許可</span>
            </button>
          )}

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 text-gray-300 rounded-xl hover:bg-white/10 transition-all"
            >
              <Check className="w-4 h-4" />
              <span className="text-xs sm:text-sm">すべて既読</span>
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
      <div className="space-y-3">
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
            const hasAttachments = (notification.attachments?.length ?? 0) > 0
            const hasLinks = (notification.links?.length ?? 0) > 0

            return (
              <div
                key={notification.id}
                className={`glass-card rounded-2xl p-5 transition-all hover:bg-white/10 hover:scale-[1.01] cursor-pointer ${
                  !notification.isRead ? 'border-l-4 ' + config.borderColor : ''
                }`}
                onClick={() => openNotification(notification)}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold text-lg ${!notification.isRead ? 'text-white' : 'text-gray-300'}`}>
                        {notification.title}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                        {config.label}
                      </span>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                      {notification.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(notification.createdAt), 'M月d日 HH:mm', { locale: ja })}
                      </span>
                      {hasAttachments && (
                        <span className="flex items-center gap-1 text-blue-400">
                          <Paperclip className="w-3 h-3" />
                          {notification.attachments?.length}件の添付
                        </span>
                      )}
                      {hasLinks && (
                        <span className="flex items-center gap-1 text-green-400">
                          <ExternalLink className="w-3 h-3" />
                          {notification.links?.length}件のリンク
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Detail Modal */}
      {selectedNotification && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedNotification(null)}
        >
          <div 
            className="glass-card w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            {(() => {
              const config = typeConfig[selectedNotification.type] || typeConfig.info
              const Icon = config.icon
              return (
                <div className={`p-6 border-b border-white/10 ${config.bgColor}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-7 h-7 ${config.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full bg-white/20 ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                        <h2 className="text-2xl font-bold text-white">
                          {selectedNotification.title}
                        </h2>
                        <p className="text-sm text-gray-300 mt-1 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(selectedNotification.createdAt), 'yyyy年M月d日 HH:mm', { locale: ja })}
                          <span className="text-gray-500">
                            ({formatDistanceToNow(new Date(selectedNotification.createdAt), { addSuffix: true, locale: ja })})
                          </span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedNotification(null)}
                      className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <X className="w-6 h-6 text-gray-400" />
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Content */}
              <div className="mb-6">
                <p className="text-gray-200 text-base leading-relaxed whitespace-pre-wrap">
                  {selectedNotification.content}
                </p>
              </div>

              {/* Attachments */}
              {selectedNotification.attachments && selectedNotification.attachments.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Paperclip className="w-5 h-5" />
                    添付ファイル
                  </h3>
                  <div className="space-y-2">
                    {selectedNotification.attachments.map((attachment) => {
                      const AttachmentIcon = getFileIcon(attachment.mimetype)
                      return (
                        <a
                          key={attachment.id}
                          href={getFileUrl(attachment.filepath)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                        >
                          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                            <AttachmentIcon className="w-6 h-6 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate group-hover:text-blue-400 transition-colors">
                              {attachment.filename}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(attachment.size)}
                            </p>
                          </div>
                          <Download className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Links */}
              {selectedNotification.links && selectedNotification.links.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <ExternalLink className="w-5 h-5" />
                    関連リンク
                  </h3>
                  <div className="space-y-2">
                    {selectedNotification.links.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                      >
                        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                          <ExternalLink className="w-6 h-6 text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium group-hover:text-green-400 transition-colors">
                            {link.title}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {link.url}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
