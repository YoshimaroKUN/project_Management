'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
  Users,
  Shield,
  Ban,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  Check,
  MessageSquare,
  Calendar,
  CheckSquare,
  Bell,
  Map,
  Database,
} from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  avatar: string | null
  isRestricted: boolean
  restrictedFeatures: string | null
  restrictionReason: string | null
  createdAt: string
  _count: {
    events: number
    tasks: number
    conversations: number
  }
}

const featureOptions = [
  { key: 'chat', label: 'AIチャット', icon: MessageSquare },
  { key: 'calendar', label: 'カレンダー', icon: Calendar },
  { key: 'tasks', label: '課題', icon: CheckSquare },
  { key: 'news', label: 'お知らせ', icon: Bell },
  { key: 'map', label: 'マップ', icon: Map },
]

const dangerZoneOptions = [
  { key: 'all-users', label: '全ユーザー削除', description: '管理者以外の全ユーザーを削除' },
  { key: 'all-notifications', label: '全お知らせ削除', description: '全お知らせと添付ファイルを削除' },
  { key: 'all-events', label: '全予定削除', description: '全ユーザーの予定を削除' },
  { key: 'all-tasks', label: '全課題削除', description: '全ユーザーの課題を削除' },
  { key: 'all-conversations', label: '全会話削除', description: '全AIチャット履歴を削除' },
  { key: 'all-markers', label: '全マーカー削除', description: '全マップマーカーを削除' },
  { key: 'reset-database', label: 'データベースリセット', description: '管理者以外の全データを削除' },
]

export default function UsersManagementPage() {
  const { data: session, status } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showRestrictionModal, setShowRestrictionModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDangerZone, setShowDangerZone] = useState(false)
  
  // Restriction form
  const [restrictedFeatures, setRestrictedFeatures] = useState<string[]>([])
  const [restrictionReason, setRestrictionReason] = useState('')
  
  // Delete form
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  
  // Danger zone
  const [dangerTarget, setDangerTarget] = useState('')
  const [dangerPassword, setDangerPassword] = useState('')
  const [dangerConfirmed, setDangerConfirmed] = useState(false)
  const [dangerProcessing, setDangerProcessing] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      redirect('/dashboard')
    }
  }, [session, status])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUsers()
    }
  }, [status])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const openRestrictionModal = (user: User) => {
    setSelectedUser(user)
    setRestrictedFeatures(user.restrictedFeatures?.split(',').filter(Boolean) || [])
    setRestrictionReason(user.restrictionReason || '')
    setShowRestrictionModal(true)
  }

  const handleUpdateRestriction = async (isRestricted: boolean) => {
    if (!selectedUser) return

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          isRestricted,
          restrictedFeatures: isRestricted ? restrictedFeatures.join(',') : null,
          restrictionReason: isRestricted ? restrictionReason : null,
        }),
      })

      if (response.ok) {
        await fetchUsers()
        setShowRestrictionModal(false)
        setSelectedUser(null)
      } else {
        const data = await response.json()
        alert(data.error || '更新に失敗しました')
      }
    } catch (error) {
      console.error('Failed to update restriction:', error)
      alert('更新に失敗しました')
    }
  }

  const openDeleteModal = (user: User) => {
    setSelectedUser(user)
    setDeletePassword('')
    setShowDeleteModal(true)
  }

  const handleDeleteUser = async () => {
    if (!selectedUser || !deletePassword) return

    setDeleting(true)
    try {
      const response = await fetch(
        `/api/admin/users?userId=${selectedUser.id}&password=${encodeURIComponent(deletePassword)}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        await fetchUsers()
        setShowDeleteModal(false)
        setSelectedUser(null)
        setDeletePassword('')
      } else {
        const data = await response.json()
        alert(data.error || '削除に失敗しました')
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
      alert('削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }

  const handleDangerZoneAction = async () => {
    if (!dangerTarget || !dangerPassword || !dangerConfirmed) return

    if (!confirm(`本当に「${dangerZoneOptions.find(o => o.key === dangerTarget)?.label}」を実行しますか？\nこの操作は取り消せません。`)) {
      return
    }

    setDangerProcessing(true)
    try {
      const response = await fetch('/api/admin/database', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: dangerTarget,
          password: dangerPassword,
          confirmed: dangerConfirmed,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message)
        setDangerTarget('')
        setDangerPassword('')
        setDangerConfirmed(false)
        await fetchUsers()
      } else {
        alert(data.error || '操作に失敗しました')
      }
    } catch (error) {
      console.error('Danger zone action failed:', error)
      alert('操作に失敗しました')
    } finally {
      setDangerProcessing(false)
    }
  }

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-glow">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">ユーザー管理</h1>
            <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">ユーザーの制限・削除を管理</p>
          </div>
        </div>
      </div>

      {/* Admin badge */}
      <div className="glass-card p-4 border-l-4 border-purple-500">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-lg">
            管理者専用
          </span>
          <span className="text-gray-400 text-sm">
            登録ユーザー: {users.length}人
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ユーザーを検索..."
          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className={`glass-card p-4 ${user.isRestricted ? 'border-l-4 border-yellow-500' : ''}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-white font-medium">{user.name?.[0] || user.email[0].toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-white truncate">{user.name || '名前未設定'}</p>
                    {user.role === 'ADMIN' && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-lg flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        管理者
                      </span>
                    )}
                    {user.isRestricted && (
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-lg flex items-center gap-1">
                        <Ban className="w-3 h-3" />
                        制限中
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 truncate">{user.email}</p>
                  <p className="text-xs text-gray-500">
                    登録: {format(new Date(user.createdAt), 'yyyy/MM/dd', { locale: ja })}
                    {' | '}予定: {user._count.events} / 課題: {user._count.tasks} / 会話: {user._count.conversations}
                  </p>
                </div>
              </div>

              {user.role !== 'ADMIN' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openRestrictionModal(user)}
                    className={`p-2 rounded-lg transition-colors ${
                      user.isRestricted
                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                    title={user.isRestricted ? '制限を編集' : '制限を追加'}
                  >
                    <Ban className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(user)}
                    className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="ユーザーを削除"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {user.isRestricted && user.restrictionReason && (
              <div className="mt-3 p-2 bg-yellow-500/10 rounded-lg text-sm text-yellow-300">
                制限理由: {user.restrictionReason}
              </div>
            )}
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div className="glass-card p-8 text-center">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">ユーザーが見つかりません</p>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="mt-8">
        <button
          onClick={() => setShowDangerZone(!showDangerZone)}
          className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
        >
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">危険ゾーン</span>
          {showDangerZone ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDangerZone && (
          <div 
            className="mt-4 p-6 rounded-xl border-2 border-yellow-500/50 animate-fade-in"
            style={{
              background: 'repeating-linear-gradient(45deg, rgba(234,179,8,0.1), rgba(234,179,8,0.1) 10px, rgba(0,0,0,0.2) 10px, rgba(0,0,0,0.2) 20px)'
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-6 h-6 text-yellow-400" />
              <h3 className="text-lg font-semibold text-yellow-400">データベース操作</h3>
            </div>

            <p className="text-yellow-300/80 text-sm mb-4">
              ⚠️ これらの操作は元に戻せません。十分に注意してください。
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">削除対象</label>
                <select
                  value={dangerTarget}
                  onChange={(e) => setDangerTarget(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-yellow-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="">選択してください...</option>
                  {dangerZoneOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  管理者パスワード
                </label>
                <input
                  type="password"
                  value={dangerPassword}
                  onChange={(e) => setDangerPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-yellow-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="パスワードを入力"
                />
              </div>

              <label className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={dangerConfirmed}
                  onChange={(e) => setDangerConfirmed(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-red-500 bg-black/30 text-red-500 focus:ring-red-500"
                />
                <span className="text-red-300 text-sm">
                  この操作は取り消すことができないことを理解し、実行することに同意します。
                </span>
              </label>

              <button
                onClick={handleDangerZoneAction}
                disabled={!dangerTarget || !dangerPassword || !dangerConfirmed || dangerProcessing}
                className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {dangerProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5" />
                    実行する
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Restriction Modal */}
      {showRestrictionModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">ユーザー制限</h3>
              <button
                onClick={() => setShowRestrictionModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-300">{selectedUser.name || selectedUser.email}</p>
              <p className="text-sm text-gray-500">{selectedUser.email}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  制限する機能
                </label>
                <div className="space-y-2">
                  {featureOptions.map((feature) => {
                    const Icon = feature.icon
                    const isChecked = restrictedFeatures.includes(feature.key)
                    return (
                      <label
                        key={feature.key}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                          isChecked ? 'bg-yellow-500/20' : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRestrictedFeatures([...restrictedFeatures, feature.key])
                            } else {
                              setRestrictedFeatures(restrictedFeatures.filter(f => f !== feature.key))
                            }
                          }}
                          className="w-5 h-5 rounded border-gray-500 bg-white/10 text-yellow-500 focus:ring-yellow-500"
                        />
                        <Icon className={`w-5 h-5 ${isChecked ? 'text-yellow-400' : 'text-gray-400'}`} />
                        <span className={isChecked ? 'text-yellow-300' : 'text-gray-300'}>
                          {feature.label}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  制限理由（任意）
                </label>
                <textarea
                  value={restrictionReason}
                  onChange={(e) => setRestrictionReason(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={2}
                  placeholder="制限の理由を入力..."
                />
              </div>

              <div className="flex gap-3">
                {selectedUser.isRestricted ? (
                  <>
                    <button
                      onClick={() => handleUpdateRestriction(false)}
                      className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      制限を解除
                    </button>
                    <button
                      onClick={() => handleUpdateRestriction(true)}
                      className="flex-1 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-medium rounded-xl transition-colors"
                    >
                      制限を更新
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleUpdateRestriction(true)}
                    disabled={restrictedFeatures.length === 0}
                    className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Ban className="w-5 h-5" />
                    制限を適用
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-400">ユーザー削除</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
              <p className="text-red-300 text-sm">
                <strong>{selectedUser.name || selectedUser.email}</strong> を削除しようとしています。
                このユーザーの全データ（予定、課題、会話履歴など）が完全に削除されます。
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  管理者パスワードを入力
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="パスワード"
                />
              </div>

              <button
                onClick={handleDeleteUser}
                disabled={!deletePassword || deleting}
                className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    削除中...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    ユーザーを削除
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
