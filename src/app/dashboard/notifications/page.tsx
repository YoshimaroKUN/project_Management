'use client'

import { useState, useEffect, useRef } from 'react'
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
  Paperclip,
  Link as LinkIcon,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Upload,
  File,
  Edit2,
  Save,
} from 'lucide-react'
import { format } from 'date-fns'
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
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState('info')
  const [isGlobal, setIsGlobal] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadToDify, setUploadToDify] = useState(true)

  // Link form state
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editType, setEditType] = useState('info')
  const [saving, setSaving] = useState(false)

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
      const response = await fetch('/api/notifications?includeAttachments=true')
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
        const data = await response.json()
        await fetchNotifications()
        setSelectedNotification(data.notification)
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

  const startEdit = () => {
    if (!selectedNotification) return
    setEditTitle(selectedNotification.title)
    setEditContent(selectedNotification.content)
    setEditType(selectedNotification.type)
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditTitle('')
    setEditContent('')
    setEditType('info')
  }

  const handleUpdate = async () => {
    if (!selectedNotification) return
    
    setSaving(true)
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedNotification.id,
          title: editTitle,
          content: editContent,
          type: editType,
        }),
      })

      if (response.ok) {
        await fetchNotifications()
        // 更新後のデータを再取得
        const updatedNotifications = await fetch('/api/notifications?includeAttachments=true')
        if (updatedNotifications.ok) {
          const data = await updatedNotifications.json()
          const updated = data.notifications.find((n: Notification) => n.id === selectedNotification.id)
          if (updated) setSelectedNotification(updated)
        }
        setIsEditing(false)
      } else {
        const data = await response.json()
        alert(data.error || '更新に失敗しました')
      }
    } catch (error) {
      console.error('Failed to update notification:', error)
      alert('更新中にエラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このお知らせを削除しますか？')) return
    
    try {
      const response = await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await fetchNotifications()
        if (selectedNotification?.id === id) {
          setSelectedNotification(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedNotification) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('notificationId', selectedNotification.id)
      formData.append('uploadToDify', uploadToDify.toString())

      const response = await fetch('/api/notifications/attachments', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        await fetchNotifications()
        const updatedNotifications = await fetch('/api/notifications?includeAttachments=true')
        if (updatedNotifications.ok) {
          const data = await updatedNotifications.json()
          const updated = data.notifications.find((n: Notification) => n.id === selectedNotification.id)
          if (updated) setSelectedNotification(updated)
        }
      } else {
        const data = await response.json()
        alert(data.error || 'アップロードに失敗しました')
      }
    } catch (error) {
      console.error('Failed to upload file:', error)
      alert('アップロード中にエラーが発生しました')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('この添付ファイルを削除しますか？')) return

    try {
      const response = await fetch(`/api/notifications/attachments?id=${attachmentId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await fetchNotifications()
        if (selectedNotification) {
          setSelectedNotification({
            ...selectedNotification,
            attachments: selectedNotification.attachments?.filter(a => a.id !== attachmentId),
          })
        }
      }
    } catch (error) {
      console.error('Failed to delete attachment:', error)
    }
  }

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedNotification) return

    try {
      const response = await fetch('/api/notifications/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: selectedNotification.id,
          title: linkTitle,
          url: linkUrl,
        }),
      })

      if (response.ok) {
        await fetchNotifications()
        const updatedNotifications = await fetch('/api/notifications?includeAttachments=true')
        if (updatedNotifications.ok) {
          const data = await updatedNotifications.json()
          const updated = data.notifications.find((n: Notification) => n.id === selectedNotification.id)
          if (updated) setSelectedNotification(updated)
        }
        setLinkTitle('')
        setLinkUrl('')
        setShowLinkModal(false)
      } else {
        const data = await response.json()
        alert(data.error || 'リンクの追加に失敗しました')
      }
    } catch (error) {
      console.error('Failed to add link:', error)
    }
  }

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('このリンクを削除しますか？')) return

    try {
      const response = await fetch(`/api/notifications/links?id=${linkId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await fetchNotifications()
        if (selectedNotification) {
          setSelectedNotification({
            ...selectedNotification,
            links: selectedNotification.links?.filter(l => l.id !== linkId),
          })
        }
      }
    } catch (error) {
      console.error('Failed to delete link:', error)
    }
  }

  const getTypeInfo = (typeValue: string) => {
    return typeOptions.find((t) => t.value === typeValue) || typeOptions[0]
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return ImageIcon
    if (mimetype === 'application/pdf') return FileText
    return File
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Notifications list */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white mb-4">お知らせ一覧</h2>
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
              const isSelected = selectedNotification?.id === notification.id

              return (
                <div
                  key={notification.id}
                  onClick={() => setSelectedNotification(notification)}
                  className={`glass-card p-4 card-hover group cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-primary-500' : ''
                  }`}
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
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">{notification.content}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">
                          {format(new Date(notification.createdAt), 'yyyy年M月d日 HH:mm', { locale: ja })}
                        </span>
                        {(notification.attachments?.length ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-xs text-blue-400">
                            <Paperclip className="w-3 h-3" />
                            {notification.attachments?.length}
                          </span>
                        )}
                        {(notification.links?.length ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-xs text-green-400">
                            <LinkIcon className="w-3 h-3" />
                            {notification.links?.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(notification.id)
                      }}
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

        {/* Detail panel */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">詳細・添付管理</h2>
          {selectedNotification ? (
            <div className="glass-card p-6 space-y-6">
              {/* Title & Content - Edit mode */}
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">タイトル</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="input-modern"
                      placeholder="お知らせのタイトル"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">内容</label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="input-modern resize-none"
                      rows={6}
                      placeholder="お知らせの内容"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">タイプ</label>
                    <div className="grid grid-cols-2 gap-2">
                      {typeOptions.map((option) => {
                        const OptionIcon = option.icon
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setEditType(option.value)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                              editType === option.value
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
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdate}
                      disabled={saving}
                      className="flex-1 btn-primary flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? '保存中...' : '保存'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="btn-secondary"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-semibold text-white">{selectedNotification.title}</h3>
                    <button
                      onClick={startEdit}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-primary-400"
                      title="編集"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    {(() => {
                      const typeInfo = getTypeInfo(selectedNotification.type)
                      const TypeIcon = typeInfo.icon
                      return (
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${typeInfo.color}`}>
                          <TypeIcon className="w-3 h-3" />
                          {typeInfo.label}
                        </span>
                      )
                    })()}
                    {selectedNotification.isGlobal && (
                      <span className="px-2 py-1 bg-primary-500/20 text-primary-400 text-xs rounded-lg">
                        全体公開
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 whitespace-pre-wrap">{selectedNotification.content}</p>
                </div>
              )}

              {/* Attachments section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-white flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    添付ファイル
                  </h4>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={uploadToDify}
                        onChange={(e) => setUploadToDify(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                      />
                      AIに情報を渡す
                    </label>
                    <label className="btn-secondary text-sm flex items-center gap-2 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      {uploading ? 'アップロード中...' : 'ファイルを追加'}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt,application/pdf"
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>
                
                {selectedNotification.attachments && selectedNotification.attachments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedNotification.attachments.map((attachment) => {
                      const FileIcon = getFileIcon(attachment.mimetype)
                      return (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-3 p-3 bg-white/5 rounded-lg group"
                        >
                          <FileIcon className="w-5 h-5 text-blue-400" />
                          <div className="flex-1 min-w-0">
                            <a
                              href={getFileUrl(attachment.filepath)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-white hover:text-blue-400 truncate block"
                            >
                              {attachment.filename}
                            </a>
                            <span className="text-xs text-gray-500">
                              {formatFileSize(attachment.size)}
                            </span>
                          </div>
                          <a
                            href={getFileUrl(attachment.filepath)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-white/10 rounded"
                          >
                            <ExternalLink className="w-4 h-4 text-gray-400" />
                          </a>
                          <button
                            onClick={() => handleDeleteAttachment(attachment.id)}
                            className="p-1 hover:bg-red-500/10 rounded text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">添付ファイルはありません</p>
                )}
              </div>

              {/* Links section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-white flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    リンク
                  </h4>
                  <button
                    onClick={() => setShowLinkModal(true)}
                    className="btn-secondary text-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    リンクを追加
                  </button>
                </div>

                {selectedNotification.links && selectedNotification.links.length > 0 ? (
                  <div className="space-y-2">
                    {selectedNotification.links.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-lg group"
                      >
                        <ExternalLink className="w-5 h-5 text-green-400" />
                        <div className="flex-1 min-w-0">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-white hover:text-green-400 truncate block"
                          >
                            {link.title}
                          </a>
                          <span className="text-xs text-gray-500 truncate block">
                            {link.url}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteLink(link.id)}
                          className="p-1 hover:bg-red-500/10 rounded text-gray-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">リンクはありません</p>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <Bell className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">お知らせを選択してください</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
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
                  placeholder="お知らせの内容（AIが参照可能）"
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

              <p className="text-xs text-gray-500">
                ※作成後に添付ファイルやリンクを追加できます
              </p>

              <button type="submit" className="w-full btn-primary flex items-center justify-center gap-2 mt-6">
                <Send className="w-4 h-4" />
                作成
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">リンクを追加</h3>
              <button
                onClick={() => setShowLinkModal(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLink} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">
                  リンク名
                </label>
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="input-modern"
                  placeholder="例: 詳細資料"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">
                  URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="input-modern"
                  placeholder="https://..."
                  required
                />
              </div>

              <button type="submit" className="w-full btn-primary flex items-center justify-center gap-2 mt-6">
                <LinkIcon className="w-4 h-4" />
                追加
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
