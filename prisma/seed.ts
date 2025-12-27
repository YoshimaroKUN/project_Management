import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const adminPassword = await hash('Admin123!', 12)
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
  const userPassword = await hash('User123!', 12)
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

  // Create sample notifications
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

  // Create sample map markers
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

  // Create sample tasks for this week
  const now = new Date()
  await prisma.task.createMany({
    data: [
      {
        title: '数学のレポート提出',
        description: '微分積分のレポートを完成させる',
        status: 'PENDING',
        priority: 'HIGH',
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        userId: user.id,
      },
      {
        title: '英語のプレゼン準備',
        description: 'プレゼン資料を作成する',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        dueDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
        userId: user.id,
      },
      {
        title: 'プログラミング課題',
        description: 'Pythonでデータ分析プログラムを作成',
        status: 'PENDING',
        priority: 'HIGH',
        dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        userId: user.id,
      },
    ],
  })
  console.log('Created sample tasks')

  // Create sample events for this week
  await prisma.event.createMany({
    data: [
      {
        title: 'プログラミング講義',
        startDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // tomorrow
        allDay: false,
        color: '#3b82f6',
        userId: user.id,
      },
      {
        title: '数学のテスト',
        startDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        allDay: false,
        color: '#ef4444',
        userId: user.id,
      },
      {
        title: '冬休み開始',
        startDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
        allDay: true,
        color: '#22c55e',
        userId: user.id,
      },
    ],
  })
  console.log('Created sample events')

  console.log('Database seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
