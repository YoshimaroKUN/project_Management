'use client'

import { AlertTriangle, Ban } from 'lucide-react'

interface RestrictionBannerProps {
  reason: string | null
  features: string | null
}

const featureLabels: Record<string, string> = {
  chat: 'AIチャット',
  calendar: 'カレンダー',
  tasks: '課題',
  news: 'お知らせ',
  map: 'マップ',
}

export default function RestrictionBanner({ reason, features }: RestrictionBannerProps) {
  const restrictedList = features?.split(',').filter(Boolean) || []

  return (
    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-yellow-500/20 rounded-lg">
          <Ban className="w-5 h-5 text-yellow-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-yellow-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            アカウントに制限がかかっています
          </h3>
          {reason && (
            <p className="text-yellow-300/80 text-sm mt-1">
              理由: {reason}
            </p>
          )}
          {restrictedList.length > 0 && (
            <p className="text-yellow-300/60 text-sm mt-1">
              制限された機能: {restrictedList.map(f => featureLabels[f] || f).join('、')}
            </p>
          )}
          <p className="text-gray-400 text-xs mt-2">
            ※ 制限を解除するには管理者にお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  )
}
