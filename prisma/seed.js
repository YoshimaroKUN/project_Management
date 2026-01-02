const { PrismaClient } = require('@prisma/client')
const bcryptjs = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const adminPassword = await bcryptjs.hash('Admin123!', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: '管理者',
      password: adminPassword,
      role: 'ADMIN',
    },
  })
  console.log('Created admin user:', admin.email)

  // Create test user
  const userPassword = await bcryptjs.hash('User123!', 12)
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: 'テストユーザー',
      password: userPassword,
      role: 'USER',
    },
  })
  console.log('Created test user:', user.email)

  // Create sample notifications (skip if already exist)
  try {
    const existingNotifications = await prisma.notification.count()
    if (existingNotifications === 0) {
      await prisma.notification.createMany({
        data: [
          {
            title: 'ようこそ！',
            content: 'AI Campus Portalへようこそ。このシステムでは、AIチャット、カレンダー、課題管理などの機能を利用できます。',
            type: 'info',
            isGlobal: true,
          },
          {
            title: 'システムメンテナンス予定',
            content: '来週月曜日の午前2時〜4時にシステムメンテナンスを実施します。',
            type: 'warning',
            isGlobal: true,
          },
        ],
      })
      console.log('Created sample notifications')
    }
  } catch (e) {
    console.log('Notifications already exist or error:', e.message)
  }

  // Create sample map markers (skip if already exist)
  try {
    const existingMarkers = await prisma.mapMarker.count()
    if (existingMarkers === 0) {
      await prisma.mapMarker.createMany({
        data: [
          {
            title: '本館',
            description: 'メインの建物です',
            latitude: 35.6762,
            longitude: 139.6503,
            category: 'building',
          },
          {
            title: '図書館',
            description: '24時間利用可能',
            latitude: 35.6765,
            longitude: 139.6510,
            category: 'facility',
          },
          {
            title: '正門',
            description: 'メインエントランス',
            latitude: 35.6758,
            longitude: 139.6500,
            category: 'entrance',
          },
        ],
      })
      console.log('Created sample map markers')
    }
  } catch (e) {
    console.log('Markers already exist or error:', e.message)
  }

  console.log('Database seeding completed!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
