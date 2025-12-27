'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import {
  Map as MapIcon,
  MapPin,
  Building2,
  ParkingCircle,
  DoorOpen,
  Landmark,
  MoreHorizontal,
  Navigation,
  Search,
  X,
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

const categoryConfig: { [key: string]: { icon: any; color: string; label: string } } = {
  building: { icon: Building2, color: 'text-blue-400', label: '建物' },
  facility: { icon: Landmark, color: 'text-purple-400', label: '施設' },
  parking: { icon: ParkingCircle, color: 'text-green-400', label: '駐車場' },
  entrance: { icon: DoorOpen, color: 'text-yellow-400', label: '入口' },
  other: { icon: MoreHorizontal, color: 'text-gray-400', label: 'その他' },
}

export default function CampusMapPage() {
  const { data: session, status } = useSession()
  const [markers, setMarkers] = useState<Marker[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

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

  const filteredMarkers = markers.filter((marker) => {
    const matchesSearch =
      searchQuery === '' ||
      marker.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      marker.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      marker.building?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = !categoryFilter || marker.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  const handleMarkerClick = (marker: Marker) => {
    setSelectedMarker(marker)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-glow">
            <MapIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">学内マップ</h1>
            <p className="text-sm text-gray-400">キャンパス内の施設を検索</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-card rounded-2xl p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="場所を検索..."
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                !categoryFilter
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              すべて
            </button>
            {Object.entries(categoryConfig).map(([key, config]) => {
              const Icon = config.icon
              return (
                <button
                  key={key}
                  onClick={() => setCategoryFilter(key)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-all ${
                    categoryFilter === key
                      ? 'bg-primary-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {config.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-2xl p-4">
            <MapComponent
              markers={filteredMarkers.map((m) => ({
                id: m.id,
                title: m.title,
                description: m.description,
                latitude: m.latitude,
                longitude: m.longitude,
                category: m.category,
              }))}
              onMarkerClick={(clickedMarker) => {
                const marker = markers.find((m) => m.id === clickedMarker.id)
                if (marker) handleMarkerClick(marker)
              }}
            />
          </div>
        </div>

        {/* Location List / Details */}
        <div className="lg:col-span-1">
          {selectedMarker ? (
            /* Selected Marker Details */
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {selectedMarker.category && categoryConfig[selectedMarker.category] && (
                    <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center`}>
                      {(() => {
                        const Icon = categoryConfig[selectedMarker.category].icon
                        return <Icon className={`w-5 h-5 ${categoryConfig[selectedMarker.category].color}`} />
                      })()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selectedMarker.title}</h3>
                    {selectedMarker.building && (
                      <p className="text-sm text-gray-400">{selectedMarker.building}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMarker(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedMarker.floor && (
                <div className="mb-4 px-3 py-2 bg-white/5 rounded-lg">
                  <span className="text-sm text-gray-400">階数: </span>
                  <span className="text-white">{selectedMarker.floor}</span>
                </div>
              )}

              {selectedMarker.description && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">説明</h4>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedMarker.description}</p>
                </div>
              )}

              {selectedMarker.directions && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                    <Navigation className="w-4 h-4" />
                    行き方
                  </h4>
                  <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedMarker.directions}</p>
                  </div>
                </div>
              )}

              {selectedMarker.nearbyInfo && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">周辺情報・目印</h4>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedMarker.nearbyInfo}</p>
                </div>
              )}

              <div className="text-xs text-gray-500">
                座標: {selectedMarker.latitude.toFixed(6)}, {selectedMarker.longitude.toFixed(6)}
              </div>
            </div>
          ) : (
            /* Location List */
            <div className="glass-card rounded-2xl p-4 max-h-[600px] overflow-y-auto">
              <h3 className="text-lg font-semibold text-white mb-4">
                場所一覧 ({filteredMarkers.length})
              </h3>
              {filteredMarkers.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400">該当する場所がありません</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMarkers.map((marker) => {
                    const config = marker.category ? categoryConfig[marker.category] : null
                    const Icon = config?.icon || MapPin

                    return (
                      <button
                        key={marker.id}
                        onClick={() => handleMarkerClick(marker)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-left"
                      >
                        <div className={`w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-4 h-4 ${config?.color || 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{marker.title}</p>
                          {marker.building && (
                            <p className="text-xs text-gray-400 truncate">{marker.building}</p>
                          )}
                        </div>
                        {marker.directions && (
                          <Navigation className="w-4 h-4 text-primary-400 flex-shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
