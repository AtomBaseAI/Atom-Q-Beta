import { NextResponse } from 'next/server'
import { clearLoginAttempts } from '@/lib/rate-limit'

export async function POST() {
  try {
    // Clear all login attempts
    const email = 'admin@demo.com'
    clearLoginAttempts(email)
    
    return NextResponse.json({ 
      message: `Login attempts cleared for ${email}`,
      status: 'success'
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to clear attempts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}