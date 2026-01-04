'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Map as MapIcon,
  Plus,
  X,
  MapPin,
  Trash2,
  Edit2,
} from 'lucide-react'

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/map/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-white/5 rounded-xl flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
    </div>
  ),
})

interface Marker {
  id: string
  title: string
  description: string | null
  directions: string | null
  floor: string | null
  building: string | null
  nearbyInfo: string | null
  latitude: number
  longitude: number
  category: string | null
}

const categoryOptions = [
  { value: 'building', label: '建物' },
  { value: 'facility', label: '施設' },
  { value: 'parking', label: '駐車場' },
  { value: 'entrance', label: '入口' },
  { value: 'other', label: 'その他' },
]

export default function MapPage() {
  const { data: session, status } = useSession()
  const [markers, setMarkers] = useState<Marker[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMarker, setEditingMarker] = useState<Marker | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [directions, setDirections] = useState('')
  const [floor, setFloor] = useState('')
  const [building, setBuilding] = useState('')
  const [nearbyInfo, setNearbyInfo] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [category, setCategory] = useState('building')

  // Check if user is admin
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      redirect('/dashboard')
    }
  }, [session, status])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchMarkers()
    }
  }, [status])

  const fetchMarkers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/markers')
      if (response.ok) {
        const data = await response.json()
        setMarkers(data.markers)
      }
    } catch (error) {
      console.error('Failed to fetch markers:', error)
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = (position?: { lat: number; lng: number }) => {
    setEditingMarker(null)
    setTitle('')
    setDescription('')
    setDirections('')
    setFloor('')
    setBuilding('')
    setNearbyInfo('')
    setLatitude(position?.lat.toString() || '')
    setLongitude(position?.lng.toString() || '')
    setCategory('building')
    setSelectedPosition(position || null)
    setShowModal(true)
  }

  const openEditModal = (marker: Marker) => {
    setEditingMarker(marker)
    setTitle(marker.title)
    setDescription(marker.description || '')
    setDirections(marker.directions || '')
    setFloor(marker.floor || '')
    setBuilding(marker.building || '')
    setNearbyInfo(marker.nearbyInfo || '')
    setLatitude(marker.latitude.toString())
    setLongitude(marker.longitude.toString())
    setCategory(marker.category || 'building')
    setSelectedPosition({ lat: marker.latitude, lng: marker.longitude })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const markerData = {
      title,
      description: description || null,
      directions: directions || null,
      floor: floor || null,
      building: building || null,
      nearbyInfo: nearbyInfo || null,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      category,
    }

    try {
      if (editingMarker) {
        const response = await fetch('/api/markers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingMarker.id, ...markerData }),
        })
        if (response.ok) {
          await fetchMarkers()
        }
      } else {
        const response = await fetch('/api/markers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(markerData),
        })
        if (response.ok) {
          await fetchMarkers()
        }
      }
    } catch (error) {
      console.error('Failed to save marker:', error)
    }

    setShowModal(false)
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/markers?id=${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await fetchMarkers()
      }
    } catch (error) {
      console.error('Failed to delete marker:', error)
    }
  }

  const handleMapClick = (lat: number, lng: number) => {
    openAddModal({ lat, lng })
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
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-glow">
            <MapIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">マップ管理</h1>
            <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">施設やポイントを地図上で管理</p>
          </div>
        </div>
        <button onClick={() => openAddModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">マーカーを追加</span>
        </button>
      </div>

      {/* Admin badge */}
      <div className="glass-card p-4 mb-6 border-l-4 border-purple-500">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-lg">
            管理者専用
          </span>
          <span className="text-gray-400 text-sm">
            地図をクリックしてマーカーを追加できます
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="glass-card p-4 mb-6">
        <MapComponent
          markers={markers}
          onMapClick={handleMapClick}
          onMarkerClick={openEditModal}
        />
      </div>

      {/* Markers list */}
      <div className="glass-card p-4">
        <h2 className="text-lg font-semibold text-white mb-4">登録済みマーカー</h2>
        {loading ? (
          <div className="py-8 text-center">
            <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : markers.length === 0 ? (
          <div className="py-8 text-center">
            <MapPin className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">マーカーがありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {markers.map((marker) => (
              <div
                key={marker.id}
                className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-primary-400" />
                      <h3 className="font-medium text-white truncate">{marker.title}</h3>
                    </div>
                    {marker.description && (
                      <p className="text-sm text-gray-400 truncate mb-2">{marker.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{marker.latitude.toFixed(6)}, {marker.longitude.toFixed(6)}</span>
                      {marker.category && (
                        <span className="px-2 py-0.5 bg-white/10 rounded">
                          {categoryOptions.find((c) => c.value === marker.category)?.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(marker)}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(marker.id)}
                      className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingMarker ? 'マーカーを編集' : '新しいマーカー'}
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
                  placeholder="場所の名前"
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
                  placeholder="場所の説明（任意）"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1 block">
                    建物名
                  </label>
                  <input
                    type="text"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    className="input-modern"
                    placeholder="例: 本館"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1 block">
                    階数・フロア
                  </label>
                  <input
                    type="text"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="input-modern"
                    placeholder="例: 3階"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">
                  🚶 行き方・道順
                </label>
                <textarea
                  value={directions}
                  onChange={(e) => setDirections(e.target.value)}
                  className="input-modern resize-none"
                  placeholder="正門から入って右手の建物です。エレベーターで3階へ上がり、左に曲がると..."
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">
                  周辺情報・目印
                </label>
                <textarea
                  value={nearbyInfo}
                  onChange={(e) => setNearbyInfo(e.target.value)}
                  className="input-modern resize-none"
                  placeholder="自動販売機の隣、トイレの向かい..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1 block">
                    緯度
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="input-modern"
                    placeholder="35.6762"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1 block">
                    経度
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="input-modern"
                    placeholder="139.6503"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  カテゴリー
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {categoryOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setCategory(option.value)}
                      className={`px-3 py-2 rounded-xl text-sm transition-colors ${
                        category === option.value
                          ? 'bg-primary-500 text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {editingMarker && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDelete(editingMarker.id)
                      setShowModal(false)
                    }}
                    className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button type="submit" className="flex-1 btn-primary">
                  {editingMarker ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
