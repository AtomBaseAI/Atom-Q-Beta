import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    // Test database connection
    const settings = await db.settings.findFirst()
    
    // Test user lookup
    const user = await db.user.findUnique({
      where: { email: 'admin@demo.com' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        password: true
      }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Test password verification
    const testPassword = 'admin123'
    const isPasswordValid = await bcrypt.compare(testPassword, user.password)
    
    return NextResponse.json({
      database: 'connected',
      settings: settings?.siteTitle || 'not found',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive
      },
      passwordValid: isPasswordValid
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}