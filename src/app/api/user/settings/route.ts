import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const settings = cookieStore.get('user-settings')
    
    if (settings) {
      return NextResponse.json(JSON.parse(settings.value))
    }
    
    return NextResponse.json({
      theme: 'dark',
      accentColor: '#3b82f6',
      notifications: {
        email: true,
        taskReminder: true,
        eventReminder: true,
        system: true,
      },
    })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json(
      { error: '設定の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const settings = await request.json()

    // Create response with cookie
    const response = NextResponse.json({ 
      message: '設定を保存しました',
      settings,
    })

    // Set cookie with settings (expires in 1 year)
    response.cookies.set('user-settings', JSON.stringify(settings), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Save settings error:', error)
    return NextResponse.json(
      { error: '設定の保存中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
