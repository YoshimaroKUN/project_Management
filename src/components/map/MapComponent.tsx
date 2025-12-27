'use client'

import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface Marker {
  id: string
  title: string
  description: string | null
  latitude: number
  longitude: number
  category: string | null
}

interface MapComponentProps {
  markers: Marker[]
  onMapClick?: (lat: number, lng: number) => void
  onMarkerClick?: (marker: Marker) => void
}

function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    },
  })
  return null
}

export default function MapComponent({ markers, onMapClick, onMarkerClick }: MapComponentProps) {
  // Default center (Tokyo)
  const defaultCenter: [number, number] = [35.6762, 139.6503]
  
  // Calculate center based on markers if available
  const center: [number, number] = markers.length > 0
    ? [
        markers.reduce((sum, m) => sum + m.latitude, 0) / markers.length,
        markers.reduce((sum, m) => sum + m.longitude, 0) / markers.length,
      ]
    : defaultCenter

  return (
    <div className="h-[500px] rounded-xl overflow-hidden">
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        className="rounded-xl"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onMapClick={onMapClick} />
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.latitude, marker.longitude]}
            eventHandlers={{
              click: () => onMarkerClick?.(marker),
            }}
          >
            <Popup>
              <div className="text-gray-800">
                <h3 className="font-semibold">{marker.title}</h3>
                {marker.description && (
                  <p className="text-sm text-gray-600">{marker.description}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
