'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import {
  Shield,
  Users,
  Bell,
  Map,
  Calendar,
  TrendingUp,
  Activity,
  FileText,
  Cloud,
  Upload,
} from 'lucide-react'

interface Stats {
  totalUsers: number
  totalNotifications: number
  totalMarkers: number
  totalEvents: number
  totalTasks: number
  recentUsers: { id: string; name: string; email: string; createdAt: string }[]
}

interface DifyStatus {
  isConfigured: boolean
  datasetId: string | null
  stats: {
    total: number
    uploaded: number
    pending: number
  }
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [difyStatus, setDifyStatus] = useState<DifyStatus | null>(null)
  const [difyUploading, setDifyUploading] = useState(false)
  const [difyResult, setDifyResult] = useState<string | null>(null)
  const [manualUploading, setManualUploading] = useState(false)
  const [manualUploadResult, setManualUploadResult] = useState<string | null>(null)
  const manualFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }
    loadStats()
    loadDifyStatus()
  }, [session, status, router])

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDifyStatus = async () => {
    try {
      const response = await fetch('/api/admin/dify-sync')
      if (response.ok) {
        const data = await response.json()
        setDifyStatus(data)
      }
    } catch (error) {
      console.error('Failed to load Dify status:', error)
    }
  }

  const handleDifyUpload = async () => {
    setDifyUploading(true)
    setDifyResult(null)
    try {
      const response = await fetch('/api/admin/dify-sync?all=true', {
        method: 'POST',
      })
      const data = await response.json()
      if (response.ok) {
        setDifyResult(`✅ ${data.message}`)
        loadDifyStatus()
      } else {
        setDifyResult(`❌ ${data.error}`)
      }
    } catch (error) {
      setDifyResult('❌ アップロード中にエラーが発生しました')
    } finally {
      setDifyUploading(false)
    }
  }

  const handleManualDifyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setManualUploading(true)
    setManualUploadResult(null)
    
    let successCount = 0
    let failCount = 0
    const results: string[] = []

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch('/api/admin/dify-sync', {
          method: 'POST',
          body: formData,
        })
        
        if (response.ok) {
          const data = await response.json()
          successCount++
          results.push(`✅ ${file.name}`)
        } else {
          const data = await response.json()
          failCount++
          results.push(`❌ ${file.name}: ${data.error}`)
        }
      } catch (error) {
        failCount++
        results.push(`❌ ${file.name}: アップロードエラー`)
      }
    }

    setManualUploadResult(`成功: ${successCount}件, 失敗: ${failCount}件\n${results.join('\n')}`)
    loadDifyStatus()
    
    // ファイル入力をリセット
    if (manualFileInputRef.current) {
      manualFileInputRef.current.value = ''
    }
    
    setManualUploading(false)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  const adminCards = [
    {
      title: 'お知らせ管理',
      description: 'お知らせの作成・編集・削除',
      icon: Bell,
      href: '/dashboard/notifications',
      color: 'from-blue-500 to-cyan-500',
      count: stats?.totalNotifications ?? 0,
    },
    {
      title: 'マップ管理',
      description: 'マップマーカーの管理',
      icon: Map,
      href: '/dashboard/map',
      color: 'from-green-500 to-emerald-500',
      count: stats?.totalMarkers ?? 0,
    },
    {
      title: 'ユーザー管理',
      description: '登録ユーザーの確認',
      icon: Users,
      href: '/dashboard/admin/users',
      color: 'from-purple-500 to-pink-500',
      count: stats?.totalUsers ?? 0,
    },
  ]

  const statCards = [
    { label: 'ユーザー数', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-blue-400' },
    { label: 'お知らせ', value: stats?.totalNotifications ?? 0, icon: Bell, color: 'text-green-400' },
    { label: 'マップマーカー', value: stats?.totalMarkers ?? 0, icon: Map, color: 'text-yellow-400' },
    { label: 'イベント', value: stats?.totalEvents ?? 0, icon: Calendar, color: 'text-purple-400' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-glow">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">管理者ダッシュボード</h1>
          <p className="text-gray-400">システム全体の管理と統計</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div key={index} className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Admin Actions */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          管理機能
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {adminCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="glass-card p-6 hover:bg-white/10 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center shadow-glow`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-white">{card.count}</span>
              </div>
              <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                {card.title}
              </h3>
              <p className="text-sm text-gray-400 mt-1">{card.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Users */}
      {stats?.recentUsers && stats.recentUsers.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            最近登録したユーザー
          </h2>
          <div className="space-y-3">
            {stats.recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">{user.name || '名前未設定'}</p>
                  <p className="text-sm text-gray-400">{user.email}</p>
                </div>
                <p className="text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Tools */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          システムツール
        </h2>
        <div className="space-y-4">
          {/* Dify連携 */}
          <div className="p-4 bg-white/5 rounded-lg border border-purple-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Cloud className="w-5 h-5 text-purple-400" />
              <p className="text-white font-medium">Difyナレッジベース連携</p>
              {difyStatus?.isConfigured ? (
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-lg">設定済み</span>
              ) : (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-lg">未設定</span>
              )}
            </div>
            <p className="text-sm text-gray-400 mb-3">
              PDFファイルをDifyのナレッジベースに自動アップロードし、AIがより詳細に回答できるようにします
            </p>
            {difyStatus?.isConfigured ? (
              <>
                <div className="flex items-center gap-4 mb-3 text-sm">
                  <span className="text-gray-400">
                    アップロード済み: <span className="text-green-400">{difyStatus.stats.uploaded}</span>
                  </span>
                  <span className="text-gray-400">
                    未アップロード: <span className="text-yellow-400">{difyStatus.stats.pending}</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    onClick={handleDifyUpload}
                    disabled={difyUploading || difyStatus.stats.pending === 0}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Upload className={`w-4 h-4 ${difyUploading ? 'animate-pulse' : ''}`} />
                    {difyUploading ? 'アップロード中...' : `未アップロードを同期 (${difyStatus.stats.pending}件)`}
                  </button>
                  <label className="btn-secondary flex items-center gap-2 cursor-pointer">
                    <FileText className={`w-4 h-4 ${manualUploading ? 'animate-pulse' : ''}`} />
                    {manualUploading ? 'アップロード中...' : '手動でファイルをアップロード'}
                    <input
                      ref={manualFileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleManualDifyUpload}
                      accept=".pdf,.txt,.md,.html,.xlsx,.xls,.docx,.csv"
                      multiple
                      disabled={manualUploading}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  手動アップロード対応形式: PDF, TXT, Markdown, HTML, Excel, Word, CSV
                </p>
              </>
            ) : (
              <div className="p-3 bg-yellow-500/10 rounded-lg text-sm text-yellow-400">
                <p>Dify連携を有効にするには、.envに以下を設定してください：</p>
                <code className="block mt-2 p-2 bg-black/30 rounded text-xs">
                  DIFY_DATASET_API_KEY=your_dataset_api_key<br />
                  DIFY_DATASET_ID=your_knowledge_base_id
                </code>
              </div>
            )}
            {difyResult && (
              <div className="mt-3 p-3 bg-white/5 rounded-lg">
                <p className="text-sm text-gray-300">{difyResult}</p>
              </div>
            )}
            {manualUploadResult && (
              <div className="mt-3 p-3 bg-white/5 rounded-lg">
                <p className="text-sm text-gray-300 whitespace-pre-line">{manualUploadResult}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
