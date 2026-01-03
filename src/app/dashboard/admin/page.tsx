'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Shield,
  Users,
  Bell,
  Map,
  MessageSquare,
  Calendar,
  TrendingUp,
  Activity,
  RefreshCw,
  FileText,
} from 'lucide-react'

interface Stats {
  totalUsers: number
  totalNotifications: number
  totalMarkers: number
  totalEvents: number
  totalTasks: number
  recentUsers: { id: string; name: string; email: string; createdAt: string }[]
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [reprocessing, setReprocessing] = useState(false)
  const [reprocessResult, setReprocessResult] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }
    loadStats()
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

  const handleReprocessAttachments = async () => {
    setReprocessing(true)
    setReprocessResult(null)
    try {
      const response = await fetch('/api/admin/reprocess-attachments', {
        method: 'POST',
      })
      const data = await response.json()
      if (response.ok) {
        setReprocessResult(`✅ ${data.message}`)
      } else {
        setReprocessResult(`❌ ${data.error}`)
      }
    } catch (error) {
      setReprocessResult('❌ 処理中にエラーが発生しました')
    } finally {
      setReprocessing(false)
    }
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
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <p className="text-white font-medium">添付ファイル再処理</p>
              <p className="text-sm text-gray-400">
                PDFなどの添付ファイルからテキストを再抽出します（AIが内容を参照できるようになります）
              </p>
            </div>
            <button
              onClick={handleReprocessAttachments}
              disabled={reprocessing}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${reprocessing ? 'animate-spin' : ''}`} />
              {reprocessing ? '処理中...' : '再処理'}
            </button>
          </div>
          {reprocessResult && (
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-sm text-gray-300">{reprocessResult}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
