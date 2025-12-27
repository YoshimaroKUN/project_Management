import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  MessageSquare,
  Calendar,
  CheckSquare,
  Bell,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'

async function getStats(userId: string) {
  // 未読通知数を計算（ユーザーが既読にしていない通知）
  const allNotifications = await prisma.notification.findMany({
    where: {
      OR: [{ userId }, { isGlobal: true }],
    },
    include: {
      readBy: {
        where: { userId },
      },
    },
  })
  const unreadNotificationCount = allNotifications.filter(n => n.readBy.length === 0).length

  const [taskCount, eventCount, messageCount] = await Promise.all([
    prisma.task.count({ where: { userId } }),
    prisma.event.count({ where: { userId } }),
    prisma.chatMessage.count({ 
      where: { 
        conversation: { userId } 
      } 
    }),
  ])

  return { taskCount, eventCount, messageCount, notificationCount: unreadNotificationCount }
}

async function getUpcomingEvents(userId: string) {
  return prisma.event.findMany({
    where: {
      userId,
      startDate: { gte: new Date() },
    },
    orderBy: { startDate: 'asc' },
    take: 5,
  })
}

async function getPendingTasks(userId: string) {
  return prisma.task.findMany({
    where: {
      userId,
      status: { not: 'COMPLETED' },
    },
    orderBy: { dueDate: 'asc' },
    take: 5,
  })
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id as string

  const [stats, upcomingEvents, pendingTasks] = await Promise.all([
    getStats(userId),
    getUpcomingEvents(userId),
    getPendingTasks(userId),
  ])

  const statCards = [
    {
      title: 'AIチャット',
      value: stats.messageCount,
      icon: MessageSquare,
      color: 'from-blue-500 to-cyan-500',
      href: '/dashboard/chat',
    },
    {
      title: '予定',
      value: stats.eventCount,
      icon: Calendar,
      color: 'from-purple-500 to-pink-500',
      href: '/dashboard/calendar',
    },
    {
      title: '課題',
      value: stats.taskCount,
      icon: CheckSquare,
      color: 'from-orange-500 to-red-500',
      href: '/dashboard/tasks',
    },
    {
      title: '未読通知',
      value: stats.notificationCount,
      icon: Bell,
      color: 'from-green-500 to-emerald-500',
      href: '/dashboard/notifications',
    },
  ]

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            おかえりなさい、{session?.user?.name || 'ユーザー'}さん
          </h1>
          <p className="text-gray-400 mt-1">今日も頑張りましょう！</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 glass-card">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-gray-300">
            {new Date().toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link
            key={stat.title}
            href={stat.href}
            className="glass-card p-6 card-hover group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{stat.title}</p>
                <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}
              >
                <stat.icon className="w-7 h-7 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Quick Chat */}
        <Link href="/dashboard/chat" className="glass-card p-6 card-hover">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AIアシスタント</h2>
              <p className="text-sm text-gray-400">質問やお手伝いはこちら</p>
            </div>
          </div>
          <div className="h-32 flex items-center justify-center border border-dashed border-white/10 rounded-xl">
            <p className="text-gray-400">クリックしてチャットを開始</p>
          </div>
        </Link>

        {/* Upcoming Events */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">今後の予定</h2>
            <Link
              href="/dashboard/calendar"
              className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
              すべて表示
            </Link>
          </div>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div
                    className="w-2 h-10 rounded-full"
                    style={{ backgroundColor: event.color || '#3b82f6' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{event.title}</p>
                    <p className="text-sm text-gray-400">
                      {formatDate(event.startDate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center">
              <p className="text-gray-400">予定がありません</p>
            </div>
          )}
        </div>

        {/* Pending Tasks */}
        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">未完了の課題</h2>
            <Link
              href="/dashboard/tasks"
              className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
              すべて表示
            </Link>
          </div>
          {pendingTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div
                    className={`w-3 h-3 rounded-full ${
                      task.priority === 'HIGH'
                        ? 'bg-red-500'
                        : task.priority === 'MEDIUM'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{task.title}</p>
                    {task.dueDate && (
                      <p className="text-sm text-gray-400">
                        期限: {formatDate(task.dueDate)}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-lg ${
                      task.status === 'IN_PROGRESS'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {task.status === 'IN_PROGRESS' ? '進行中' : '未着手'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center">
              <p className="text-gray-400">未完了の課題はありません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
