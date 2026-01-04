import { Ban, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface RestrictedPageProps {
  feature: string
  reason?: string | null
}

export default function RestrictedPage({ feature, reason }: RestrictedPageProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Ban className="w-10 h-10 text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          アクセスが制限されています
        </h1>
        <p className="text-gray-400 mb-4">
          この機能（{feature}）へのアクセスは管理者により制限されています。
        </p>
        {reason && (
          <p className="text-yellow-300/80 text-sm mb-6 p-3 bg-yellow-500/10 rounded-xl">
            制限理由: {reason}
          </p>
        )}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          ダッシュボードに戻る
        </Link>
      </div>
    </div>
  )
}
