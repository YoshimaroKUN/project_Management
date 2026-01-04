import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/layout/Sidebar'
import RestrictionBanner from '@/components/layout/RestrictionBanner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // ユーザーの制限状態を取得
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      isRestricted: true,
      restrictedFeatures: true,
      restrictionReason: true,
    }
  })

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="lg:ml-72 min-h-screen">
        <div className="p-6 lg:p-8 pt-16 lg:pt-8">
          {user?.isRestricted && (
            <RestrictionBanner 
              reason={user.restrictionReason}
              features={user.restrictedFeatures}
            />
          )}
          {children}
        </div>
      </main>
    </div>
  )
}
