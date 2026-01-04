import { prisma } from './prisma'

export type RestrictedFeature = 'chat' | 'calendar' | 'tasks' | 'news' | 'map'

export async function checkUserRestriction(userId: string): Promise<{
  isRestricted: boolean
  restrictedFeatures: RestrictedFeature[]
  restrictionReason: string | null
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isRestricted: true,
      restrictedFeatures: true,
      restrictionReason: true,
    }
  })

  if (!user) {
    return { isRestricted: false, restrictedFeatures: [], restrictionReason: null }
  }

  const features = (user.restrictedFeatures?.split(',').filter(Boolean) || []) as RestrictedFeature[]

  return {
    isRestricted: user.isRestricted,
    restrictedFeatures: features,
    restrictionReason: user.restrictionReason,
  }
}

export function isFeatureRestricted(
  restrictedFeatures: RestrictedFeature[],
  feature: RestrictedFeature
): boolean {
  return restrictedFeatures.includes(feature)
}
