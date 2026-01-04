'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  CheckSquare,
  Bell,
  Map,
  LogOut,
  Menu,
  X,
  Sparkles,
  User,
  ChevronDown,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import Image from 'next/image'

const navigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { name: 'AIチャット', href: '/dashboard/chat', icon: MessageSquare, key: 'chat' },
  { name: 'カレンダー', href: '/dashboard/calendar', icon: Calendar, key: 'calendar' },
  { name: '課題一覧', href: '/dashboard/tasks', icon: CheckSquare, key: 'tasks' },
  { name: 'お知らせ', href: '/dashboard/news', icon: Bell, key: 'news' },
  { name: '学内マップ', href: '/dashboard/campus-map', icon: Map, key: 'map' },
]

const adminNavigation = [
  { name: '管理ダッシュボード', href: '/dashboard/admin', icon: Shield },
  { name: 'ユーザー管理', href: '/dashboard/admin/users', icon: Users },
  { name: 'お知らせ管理', href: '/dashboard/notifications', icon: Bell },
  { name: 'マップ管理', href: '/dashboard/map', icon: Map },
]

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 glass-button rounded-xl"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-dark-card/80 backdrop-blur-xl border-r border-white/10 z-40 transform transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-glow">
                {/* Replace with your school logo */}
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">AI Campus</h1>
                <p className="text-xs text-gray-400">Portal System</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              メインメニュー
            </p>
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              )
            })}

            {isAdmin && (
              <>
                <div className="my-4 border-t border-white/10" />
                <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  管理者メニュー
                </p>
                {adminNavigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </>
            )}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-white/10">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden relative bg-gradient-to-br from-blue-500 to-purple-600">
                  {session?.user?.avatar ? (
                    <Image
                      src={session.user.avatar}
                      alt="アバター"
                      fill
                      className="object-cover"
                      unoptimized
                      onError={(e) => {
                        // 画像読み込み失敗時は非表示にしてフォールバックを表示
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : null}
                  <User className="w-5 h-5 text-white absolute" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white truncate">
                    {session?.user?.name || 'ユーザー'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {session?.user?.email}
                  </p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    showUserMenu ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showUserMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 glass-card p-2 animate-fade-in">
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    設定
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
