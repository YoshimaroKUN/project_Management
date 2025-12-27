'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Settings, User, Lock, Bell, Palette, Save, Upload, Camera, Check, AlertCircle, CheckCircle } from 'lucide-react'
import Image from 'next/image'

type Theme = 'dark' | 'light' | 'system'

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession()
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Profile state
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Security state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Appearance state (managed locally)
  const [theme, setThemeState] = useState<Theme>('dark')
  const [accentColor, setAccentColorState] = useState('#3b82f6')

  // Notification settings
  const [notifications, setNotificationsState] = useState({
    email: true,
    taskReminder: true,
    eventReminder: true,
    system: true,
  })

  const tabs = [
    { id: 'profile', label: 'プロフィール', icon: User },
    { id: 'security', label: 'セキュリティ', icon: Lock },
    { id: 'notifications', label: '通知', icon: Bell },
    { id: 'appearance', label: '外観', icon: Palette },
  ]

  // Load settings from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null
    const savedAccentColor = localStorage.getItem('accentColor')
    if (savedTheme) setThemeState(savedTheme)
    if (savedAccentColor) setAccentColorState(savedAccentColor)
  }, [])

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const response = await fetch('/api/user')
        if (response.ok) {
          const data = await response.json()
          setName(data.user?.name || '')
          setAvatar(data.user?.avatar || null)
        }
      } catch (error) {
        console.error('Failed to load user data:', error)
      }
    }
    loadUserData()
  }, [])

  const showMessage = (msg: string, isError = false) => {
    if (isError) {
      setError(msg)
      setMessage('')
    } else {
      setMessage(msg)
      setError('')
    }
    setTimeout(() => {
      setMessage('')
      setError('')
    }, 3000)
  }

  // Handle avatar upload
  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setAvatar(data.avatarUrl)
        showMessage('アバターを更新しました')
        // Update session with new avatar
        await updateSession({ user: { ...session?.user, avatar: data.avatarUrl } })
      } else {
        showMessage(data.error || 'アップロードに失敗しました', true)
      }
    } catch (error) {
      showMessage('アップロード中にエラーが発生しました', true)
    } finally {
      setUploading(false)
    }
  }

  // Handle profile save
  const handleProfileSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      const data = await response.json()

      if (response.ok) {
        showMessage('プロフィールを保存しました')
        await updateSession({ user: { ...session?.user, name } })
      } else {
        showMessage(data.error || '保存に失敗しました', true)
      }
    } catch (error) {
      showMessage('保存中にエラーが発生しました', true)
    } finally {
      setSaving(false)
    }
  }

  // Handle password change
  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      showMessage('新しいパスワードが一致しません', true)
      return
    }

    if (newPassword.length < 8) {
      showMessage('パスワードは8文字以上である必要があります', true)
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await response.json()

      if (response.ok) {
        showMessage('パスワードを変更しました')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        showMessage(data.error || 'パスワードの変更に失敗しました', true)
      }
    } catch (error) {
      showMessage('パスワード変更中にエラーが発生しました', true)
    } finally {
      setSaving(false)
    }
  }

  // Handle notification toggle
  const handleNotificationToggle = (key: keyof typeof notifications, value: boolean) => {
    setNotificationsState(prev => ({
      ...prev,
      [key]: value
    }))
    showMessage('通知設定を更新しました')
  }

  // Apply theme to DOM
  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    let resolvedTheme: 'dark' | 'light' = 'dark'
    
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      resolvedTheme = prefersDark ? 'dark' : 'light'
    } else {
      resolvedTheme = newTheme
    }

    if (resolvedTheme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
  }

  // Handle theme change
  const handleThemeChange = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
    showMessage('テーマを変更しました')
  }

  // Handle accent color change
  const handleAccentColorChange = (color: string) => {
    setAccentColorState(color)
    localStorage.setItem('accentColor', color)
    document.documentElement.style.setProperty('--accent-color', color)
    showMessage('アクセントカラーを変更しました')
  }

  const themeOptions = [
    { value: 'dark' as const, label: 'ダーク' },
    { value: 'light' as const, label: 'ライト' },
    { value: 'system' as const, label: 'システム' },
  ]

  const accentColors = [
    { value: '#3b82f6', name: 'ブルー' },
    { value: '#8b5cf6', name: 'パープル' },
    { value: '#ec4899', name: 'ピンク' },
    { value: '#22c55e', name: 'グリーン' },
    { value: '#f97316', name: 'オレンジ' },
    { value: '#ef4444', name: 'レッド' },
    { value: '#14b8a6', name: 'ティール' },
    { value: '#eab308', name: 'イエロー' },
  ]

  const notificationOptions = [
    { key: 'email', label: 'メール通知', description: '重要なお知らせをメールで受け取る' },
    { key: 'taskReminder', label: 'タスクリマインダー', description: '期限が近いタスクの通知' },
    { key: 'eventReminder', label: 'イベント通知', description: '予定のリマインダー' },
    { key: 'system', label: 'システム通知', description: 'メンテナンス情報など' },
  ]

  return (
    <div className="animate-fade-in">
      {/* Toast Messages */}
      {(message || error) && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${
            error 
              ? 'bg-red-500/90 text-white' 
              : 'bg-green-500/90 text-white'
          }`}>
            {error ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            <span>{error || message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center shadow-glow">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">設定</h1>
          <p className="text-sm text-gray-400">アカウントとアプリの設定を管理</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="glass-card p-4">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-500/20 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <TabIcon className="w-5 h-5" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 glass-card p-6">
          {message && (
            <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm animate-fade-in">
              {message}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">プロフィール設定</h2>
              
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <div 
                  className="relative w-24 h-24 rounded-full cursor-pointer group"
                  onClick={handleAvatarClick}
                >
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                    {avatar ? (
                      <Image
                        src={avatar}
                        alt="アバター"
                        fill
                        className="rounded-full object-cover"
                        unoptimized
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : null}
                    <User className="w-12 h-12 text-white absolute" />
                  </div>
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {uploading ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </div>
                </div>
                <div>
                  <button 
                    onClick={handleAvatarClick}
                    className="btn-secondary"
                    disabled={uploading}
                  >
                    {uploading ? 'アップロード中...' : 'アバターを変更'}
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    JPEG, PNG, GIF, WebP（最大5MB）
                  </p>
                </div>
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1 block">名前</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-modern"
                    placeholder="名前"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1 block">メールアドレス</label>
                  <input
                    type="email"
                    defaultValue={session?.user?.email || ''}
                    className="input-modern"
                    placeholder="email@example.com"
                    disabled
                  />
                </div>
              </div>

              <button onClick={handleProfileSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    変更を保存
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">セキュリティ設定</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1 block">現在のパスワード</label>
                  <input 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input-modern" 
                    placeholder="••••••••" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1 block">新しいパスワード</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-modern" 
                    placeholder="••••••••" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1 block">パスワード確認</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-modern" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>

              <button onClick={handlePasswordChange} disabled={saving} className="btn-primary flex items-center gap-2">
                <Lock className="w-4 h-4" />
                パスワードを変更
              </button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">通知設定</h2>

              <div className="space-y-4">
                {[
                  { key: 'email' as const, label: 'メール通知', description: '重要なお知らせをメールで受け取る' },
                  { key: 'taskReminder' as const, label: 'タスクリマインダー', description: '期限が近いタスクの通知' },
                  { key: 'eventReminder' as const, label: 'イベント通知', description: '予定のリマインダー' },
                  { key: 'system' as const, label: 'システム通知', description: 'メンテナンス情報など' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl"
                  >
                    <div>
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-sm text-gray-400">{item.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={notifications[item.key]}
                        onChange={(e) => handleNotificationToggle(item.key, e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">外観設定</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">テーマ</label>
                  <div className="grid grid-cols-3 gap-3">
                    {themeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleThemeChange(option.value)}
                        className={`px-4 py-3 rounded-xl text-sm transition-colors ${
                          theme === option.value
                            ? 'bg-primary-500 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">アクセントカラー</label>
                  <div className="flex flex-wrap gap-3">
                    {accentColors.map((colorOption) => (
                      <button
                        key={colorOption.value}
                        onClick={() => handleAccentColorChange(colorOption.value)}
                        className={`w-10 h-10 rounded-full transition-transform hover:scale-110 ${
                          accentColor === colorOption.value ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-bg' : ''
                        }`}
                        style={{ backgroundColor: colorOption.value }}
                        title={colorOption.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
