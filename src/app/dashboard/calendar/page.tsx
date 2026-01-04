'use client'

import { useState, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Calendar as CalendarIcon,
  Clock,
  Edit2,
  Trash2,
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Event {
  id: string
  title: string
  description: string | null
  startDate: string
  endDate: string | null
  allDay: boolean
  color: string
}

const colors = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
]

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [color, setColor] = useState(colors[0])

  useEffect(() => {
    fetchEvents()
  }, [currentDate])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const month = currentDate.getMonth() + 1
      const year = currentDate.getFullYear()
      const response = await fetch(`/api/events?month=${month}&year=${year}`)
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events)
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    return eachDayOfInterval({ start, end })
  }

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(new Date(event.startDate), day))
  }

  const openAddModal = (date?: Date) => {
    setEditingEvent(null)
    setTitle('')
    setDescription('')
    setStartDate(format(date || new Date(), 'yyyy-MM-dd'))
    setStartTime('09:00')
    setEndDate('')
    setEndTime('')
    setAllDay(false)
    setColor(colors[0])
    setSelectedDate(date || null)
    setShowModal(true)
  }

  const openEditModal = (event: Event) => {
    setEditingEvent(event)
    setTitle(event.title)
    setDescription(event.description || '')
    setStartDate(format(new Date(event.startDate), 'yyyy-MM-dd'))
    setStartTime(format(new Date(event.startDate), 'HH:mm'))
    if (event.endDate) {
      setEndDate(format(new Date(event.endDate), 'yyyy-MM-dd'))
      setEndTime(format(new Date(event.endDate), 'HH:mm'))
    } else {
      setEndDate('')
      setEndTime('')
    }
    setAllDay(event.allDay)
    setColor(event.color)
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const eventData = {
      title,
      description: description || null,
      startDate: allDay ? startDate : `${startDate}T${startTime}`,
      endDate: endDate ? (allDay ? endDate : `${endDate}T${endTime}`) : null,
      allDay,
      color,
    }

    try {
      if (editingEvent) {
        const response = await fetch('/api/events', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingEvent.id, ...eventData }),
        })
        if (response.ok) {
          await fetchEvents()
        }
      } else {
        const response = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        })
        if (response.ok) {
          await fetchEvents()
        }
      }
    } catch (error) {
      console.error('Failed to save event:', error)
    }

    setShowModal(false)
  }

  const handleDelete = async () => {
    if (!editingEvent) return

    try {
      const response = await fetch(`/api/events?id=${editingEvent.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await fetchEvents()
      }
    } catch (error) {
      console.error('Failed to delete event:', error)
    }

    setShowModal(false)
  }

  const days = getDaysInMonth()
  const firstDayOfMonth = startOfMonth(currentDate).getDay()
  const weekDays = ['日', '月', '火', '水', '木', '金', '土']

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-glow">
            <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">カレンダー</h1>
            <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">予定を管理しましょう</p>
          </div>
        </div>
        <button onClick={() => openAddModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">予定を追加</span>
        </button>
      </div>

      {/* Calendar */}
      <div className="glass-card p-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold text-white">
            {format(currentDate, 'yyyy年 M月', { locale: ja })}
          </h2>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, index) => (
            <div
              key={day}
              className={`text-center py-2 text-sm font-medium ${
                index === 0 ? 'text-red-400' : index === 6 ? 'text-blue-400' : 'text-gray-400'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before the first day of month */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} className="h-24" />
          ))}

          {/* Days */}
          {days.map((day) => {
            const dayEvents = getEventsForDay(day)
            const isToday = isSameDay(day, new Date())
            const dayOfWeek = day.getDay()

            return (
              <div
                key={day.toISOString()}
                onClick={() => openAddModal(day)}
                className={`h-24 p-2 rounded-xl border border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                  isToday ? 'bg-primary-500/20 border-primary-500/50' : ''
                }`}
              >
                <div
                  className={`text-sm font-medium mb-1 ${
                    isToday
                      ? 'text-primary-400'
                      : dayOfWeek === 0
                      ? 'text-red-400'
                      : dayOfWeek === 6
                      ? 'text-blue-400'
                      : 'text-white'
                  }`}
                >
                  {format(day, 'd')}
                </div>
                <div className="space-y-1 overflow-hidden">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(event)
                      }}
                      className="text-xs px-2 py-1 rounded truncate"
                      style={{ backgroundColor: event.color + '30', color: event.color }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-400 px-2">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingEvent ? '予定を編集' : '新しい予定'}
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
                  placeholder="予定のタイトル"
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
                  placeholder="予定の詳細（任意）"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allDay"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="allDay" className="text-sm text-gray-300">
                  終日
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1 block">
                    開始日
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input-modern"
                    required
                  />
                </div>
                {!allDay && (
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">
                      開始時間
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="input-modern"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1 block">
                    終了日（任意）
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input-modern"
                  />
                </div>
                {!allDay && (
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">
                      終了時間
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="input-modern"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  カラー
                </label>
                <div className="flex gap-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        color === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-dark-bg' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {editingEvent && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button type="submit" className="flex-1 btn-primary">
                  {editingEvent ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
