import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { useUserStore } from "@/stores/user"

// Cache for maintenance mode to reduce database calls
let maintenanceModeCache: {
  value: boolean | null
  timestamp: number
} = {
  value: null,
  timestamp: 0
}

const MAINTENANCE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getMaintenanceMode(): Promise<boolean> {
  const now = Date.now()
  
  // Return cached value if still valid
  if (maintenanceModeCache.value !== null && 
      now - maintenanceModeCache.timestamp < MAINTENANCE_CACHE_TTL) {
    return maintenanceModeCache.value
  }

  try {
    const settings = await db.settings.findFirst({
      select: { maintenanceMode: true }
    })
    
    const isMaintenance = settings?.maintenanceMode || false
    
    // Update cache
    maintenanceModeCache = {
      value: isMaintenance,
      timestamp: now
    }
    
    return isMaintenance
  } catch (error) {
    // If database fails, assume no maintenance mode for safety
    return false
  }
}

// Rate limiting using in-memory cache
const loginAttempts = new Map<string, {
  count: number
  lastAttempt: number
  lockedUntil?: number
}>()

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes
const ATTEMPT_WINDOW = 5 * 60 * 1000 // 5 minutes

function checkRateLimit(email: string): { allowed: boolean; remainingAttempts: number; lockedUntil?: number } {
  const now = Date.now()
  const attempts = loginAttempts.get(email)
  
  if (!attempts) {
    loginAttempts.set(email, { count: 1, lastAttempt: now })
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 }
  }
  
  // Check if account is locked
  if (attempts.lockedUntil && now < attempts.lockedUntil) {
    return { 
      allowed: false, 
      remainingAttempts: 0, 
      lockedUntil: attempts.lockedUntil 
    }
  }
  
  // Reset attempts if window has passed
  if (now - attempts.lastAttempt > ATTEMPT_WINDOW) {
    loginAttempts.set(email, { count: 1, lastAttempt: now })
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 }
  }
  
  // Increment attempts
  const newCount = attempts.count + 1
  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - newCount)
  
  if (newCount >= MAX_ATTEMPTS) {
    // Lock the account
    const lockedUntil = now + LOCKOUT_DURATION
    loginAttempts.set(email, { count: newCount, lastAttempt: now, lockedUntil })
    return { allowed: false, remainingAttempts: 0, lockedUntil }
  }
  
  loginAttempts.set(email, { count: newCount, lastAttempt: now })
  return { allowed: true, remainingAttempts }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Check rate limiting
        const rateLimitResult = checkRateLimit(credentials.email)
        if (!rateLimitResult.allowed) {
          if (rateLimitResult.lockedUntil) {
            const lockTimeRemaining = Math.ceil((rateLimitResult.lockedUntil - Date.now()) / 60000)
            throw new Error(`Too many login attempts. Account locked for ${lockTimeRemaining} minutes.`)
          }
          throw new Error('Too many login attempts. Please try again later.')
        }

        try {
          // Check maintenance mode (cached)
          const isMaintenance = await getMaintenanceMode()
          
          if (isMaintenance) {
            // Only allow admin users to login during maintenance mode
            const user = await db.user.findUnique({
              where: { email: credentials.email },
              select: { id: true, role: true, isActive: true }
            })

            if (!user || user.role !== 'ADMIN' || !user.isActive) {
              throw new Error('Site is under maintenance. Only administrators can login.')
            }
          }

          // Single optimized user query with all needed fields
          const user = await db.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              avatar: true,
              phone: true,
              password: true,
              isActive: true
            }
          })

          if (!user || !user.isActive) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            return null
          }

          // Clear successful login attempts
          loginAttempts.delete(credentials.email)

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatar: user.avatar,
            phone: user.phone,
          }
        } catch (error) {
          if (error instanceof Error) {
            throw error
          }
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
        token.name = user.name
        token.avatar = user.avatar
        token.phone = user.phone
        
        // Update client-side store
        if (typeof window !== 'undefined') {
          useUserStore.getState().setUser({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            phone: user.phone
          })
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role
        session.user.name = token.name as string
        session.user.avatar = token.avatar as string
        session.user.phone = token.phone as string
        
        // Update client-side store
        if (typeof window !== 'undefined') {
          useUserStore.getState().setUser({
            id: token.id as string,
            name: token.name as string,
            email: session.user.email,
            role: token.role,
            avatar: token.avatar as string,
            phone: token.phone as string
          })
        }
      }
      return session
    }
  },
  pages: {
    signIn: "/"
  },
  secret: process.env.NEXTAUTH_SECRET,
}