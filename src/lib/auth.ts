import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from './prisma'

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name: string | null
    role: 'USER' | 'ADMIN'
    avatar?: string | null
  }
  
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      role: 'USER' | 'ADMIN'
      avatar?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'USER' | 'ADMIN'
    avatar?: string | null
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('メールアドレスとパスワードを入力してください')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          throw new Error('アカウントが見つかりません')
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error('パスワードが正しくありません')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as 'USER' | 'ADMIN',
          avatar: user.avatar,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.avatar = user.avatar
      }
      // Handle session update (e.g., when avatar is changed)
      if (trigger === 'update' && session?.user) {
        token.avatar = session.user.avatar ?? token.avatar
        token.name = session.user.name ?? token.name
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.avatar = token.avatar
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}
