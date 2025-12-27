'use client'

import { useState, useEffect } from 'react'
import {
  CheckSquare,
  Plus,
  X,
  Circle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Filter,
  Trash2,
} from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Task {
  id: string
  title: string
  description: string | null
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  dueDate: string | null
  createdAt: string
}

const statusOptions = [
  { value: 'PENDING', label: '未着手', icon: Circle, color: 'text-gray-400' },
  { value: 'IN_PROGRESS', label: '進行中', icon: Clock, color: 'text-blue-400' },
  { value: 'COMPLETED', label: '完了', icon: CheckCircle2, color: 'text-green-400' },
]

const priorityOptions = [
  { value: 'LOW', label: '低', color: 'bg-green-500' },
  { value: 'MEDIUM', label: '中', color: 'bg-yellow-500' },
  { value: 'HIGH', label: '高', color: 'bg-red-500' },
]

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [filter, setFilter] = useState<string>('all')

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    fetchTasks()
  }, [filter])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const url = filter === 'all' ? '/api/tasks' : `/api/tasks?status=${filter}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks)
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setEditingTask(null)
    setTitle('')
    setDescription('')
    setPriority('MEDIUM')
    setDueDate('')
    setShowModal(true)
  }

  const openEditModal = (task: Task) => {
    setEditingTask(task)
    setTitle(task.title)
    setDescription(task.description || '')
    setPriority(task.priority)
    setDueDate(task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const taskData = {
      title,
      description: description || null,
      priority,
      dueDate: dueDate || null,
    }

    try {
      if (editingTask) {
        const response = await fetch('/api/tasks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTask.id, ...taskData }),
        })
        if (response.ok) {
          await fetchTasks()
        }
      } else {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData),
        })
        if (response.ok) {
          await fetchTasks()
        }
      }
    } catch (error) {
      console.error('Failed to save task:', error)
    }

    setShowModal(false)
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      })
      if (response.ok) {
        await fetchTasks()
      }
    } catch (error) {
      console.error('Failed to update task status:', error)
    }
  }

  const handleDelete = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks?id=${taskId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await fetchTasks()
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const getStatusInfo = (status: string) => {
    return statusOptions.find((s) => s.value === status) || statusOptions[0]
  }

  const getPriorityInfo = (priority: string) => {
    return priorityOptions.find((p) => p.value === priority) || priorityOptions[1]
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-glow">
            <CheckSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">課題一覧</h1>
            <p className="text-sm text-gray-400">タスクを管理しましょう</p>
          </div>
        </div>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          課題を追加
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400 mr-2">フィルター:</span>
          {[
            { value: 'all', label: 'すべて' },
            ...statusOptions,
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === option.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks list */}
      <div className="space-y-3">
        {loading ? (
          <div className="glass-card p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <CheckSquare className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">課題がありません</p>
            <button
              onClick={openAddModal}
              className="mt-4 text-primary-400 hover:text-primary-300 transition-colors"
            >
              新しい課題を追加
            </button>
          </div>
        ) : (
          tasks.map((task) => {
            const statusInfo = getStatusInfo(task.status)
            const priorityInfo = getPriorityInfo(task.priority)
            const StatusIcon = statusInfo.icon

            return (
              <div
                key={task.id}
                className="glass-card p-4 card-hover group"
              >
                <div className="flex items-start gap-4">
                  {/* Status button */}
                  <button
                    onClick={() => {
                      const currentIndex = statusOptions.findIndex((s) => s.value === task.status)
                      const nextIndex = (currentIndex + 1) % statusOptions.length
                      handleStatusChange(task.id, statusOptions[nextIndex].value)
                    }}
                    className={`mt-1 ${statusInfo.color} hover:opacity-80 transition-opacity`}
                  >
                    <StatusIcon className="w-6 h-6" />
                  </button>

                  {/* Task content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className={`font-medium ${
                          task.status === 'COMPLETED'
                            ? 'text-gray-500 line-through'
                            : 'text-white'
                        }`}
                      >
                        {task.title}
                      </h3>
                      <span
                        className={`w-2 h-2 rounded-full ${priorityInfo.color}`}
                        title={`優先度: ${priorityInfo.label}`}
                      />
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          期限: {format(new Date(task.dueDate), 'M月d日', { locale: ja })}
                        </span>
                      )}
                      <span>
                        作成: {format(new Date(task.createdAt), 'M月d日', { locale: ja })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(task)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
              <h3 className="text-xl font-semibold text-white">
                {editingTask ? '課題を編集' : '新しい課題'}
              </h3>
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
                  placeholder="課題のタイトル"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">
                  説明
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-modern resize-none"
                  placeholder="課題の詳細（任意）"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  優先度
                </label>
                <div className="flex gap-2">
                  {priorityOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPriority(option.value as typeof priority)}
                      className={`flex-1 px-4 py-2 rounded-xl text-sm transition-colors ${
                        priority === option.value
                          ? 'bg-white/20 text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${option.color} mr-2`}
                      />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">
                  期限（任意）
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="input-modern"
                />
              </div>

              <button type="submit" className="w-full btn-primary mt-6">
                {editingTask ? '更新' : '追加'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
