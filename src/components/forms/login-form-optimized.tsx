"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { loginSchema } from "@/schema/auth"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useUserStore } from "@/stores/user"
import { LoadingButton } from "@/components/ui/laodaing-button"
import { toasts } from "@/lib/toasts"
import type { z } from "zod"

type LoginFormData = z.infer<typeof loginSchema>

interface LoginFormOptimizedProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

// Rate limiting state
const loginAttempts = new Map<string, {
  count: number
  lastAttempt: number
  lockedUntil?: number
}>()

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes
const ATTEMPT_WINDOW = 5 * 60 * 1000 // 5 minutes

export function LoginFormOptimized({ onSuccess, onError }: LoginFormOptimizedProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remainingAttempts, setRemainingAttempts] = useState(MAX_ATTEMPTS)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    }
  })

  const { data: session } = useSession()
  const router = useRouter()
  const { setUser } = useUserStore()

  // Redirect if already authenticated
  useEffect(() => {
    if (session) {
      if (session.user.role === 'ADMIN') {
        router.push("/admin")
      } else {
        router.push("/user")
      }
    }
  }, [session, router])

  // Check lock status
  useEffect(() => {
    const checkLockStatus = () => {
      const email = form.getValues('email')
      if (!email) return

      const attempts = loginAttempts.get(email)
      if (attempts?.lockedUntil) {
        const now = Date.now()
        if (now < attempts.lockedUntil) {
          setLockedUntil(attempts.lockedUntil)
          const remaining = Math.ceil((attempts.lockedUntil - now) / 1000)
          if (remaining > 0) {
            setTimeout(checkLockStatus, 1000)
          }
        } else {
          // Lock expired
          setLockedUntil(null)
          loginAttempts.delete(email)
          setRemainingAttempts(MAX_ATTEMPTS)
        }
      }
    }

    const interval = setInterval(checkLockStatus, 1000)
    return () => clearInterval(interval)
  }, [form])

  const checkRateLimit = useCallback((email: string): { allowed: boolean; remainingAttempts: number; lockedUntil?: number } => {
    const now = Date.now()
    const attempts = loginAttempts.get(email)
    
    if (!attempts) {
      loginAttempts.set(email, { count: 1, lastAttempt: now })
      setRemainingAttempts(MAX_ATTEMPTS - 1)
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
      setRemainingAttempts(MAX_ATTEMPTS - 1)
      return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 }
    }
    
    // Increment attempts
    const newCount = attempts.count + 1
    const remaining = Math.max(0, MAX_ATTEMPTS - newCount)
    setRemainingAttempts(remaining)
    
    if (newCount >= MAX_ATTEMPTS) {
      // Lock the account
      const lockedUntil = now + LOCKOUT_DURATION
      setLockedUntil(lockedUntil)
      loginAttempts.set(email, { count: newCount, lastAttempt: now, lockedUntil })
      return { allowed: false, remainingAttempts: 0, lockedUntil }
    }
    
    loginAttempts.set(email, { count: newCount, lastAttempt: now })
    return { allowed: true, remainingAttempts: remaining }
  }, [])

  const onSubmit = async (data: LoginFormData) => {
    const email = data.email
    
    // Check rate limiting
    const rateLimitResult = checkRateLimit(email)
    if (!rateLimitResult.allowed) {
      if (rateLimitResult.lockedUntil) {
        const lockTimeRemaining = Math.ceil((rateLimitResult.lockedUntil - Date.now()) / 60000)
        const errorMessage = `Too many login attempts. Account locked for ${lockTimeRemaining} minutes.`
        setError(errorMessage)
        onError?.(errorMessage)
        toasts.loginFailed(errorMessage)
      } else {
        const errorMessage = 'Too many login attempts. Please try again later.'
        setError(errorMessage)
        onError?.(errorMessage)
        toasts.loginFailed(errorMessage)
      }
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        let errorMessage = "Invalid email or password"
        
        if (result.error.includes('maintenance')) {
          errorMessage = "Site is under maintenance. Only administrators can login."
        } else if (result.error.includes('locked')) {
          errorMessage = result.error
        }
        
        setError(errorMessage)
        onError?.(errorMessage)
        toasts.loginFailed(errorMessage)
      } else {
        // Clear successful login attempts
        loginAttempts.delete(email)
        setRemainingAttempts(MAX_ATTEMPTS)
        setLockedUntil(null)
        
        toasts.loginSuccess()
        onSuccess?.()
        
        // Update user store
        if (result) {
          setUser({
            id: '',
            name: '',
            email: data.email,
            role: '',
          })
        }
      }
    } catch (error) {
      const errorMessage = "An error occurred. Please try again."
      setError(errorMessage)
      onError?.(errorMessage)
      toasts.loginFailed(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const timeRemaining = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000)) : 0

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {lockedUntil && timeRemaining > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              Account temporarily locked. Please try again in {formatTimeRemaining(timeRemaining)}.
            </AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="Enter your email" 
                  {...field}
                  disabled={isLoading || !!lockedUntil}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password" 
                    {...field}
                    disabled={isLoading || !!lockedUntil}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading || !!lockedUntil}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {remainingAttempts < MAX_ATTEMPTS && !lockedUntil && (
          <div className="text-sm text-muted-foreground">
            {remainingAttempts} attempts remaining
          </div>
        )}

        <LoadingButton 
          type="submit" 
          className="w-full" 
          isLoading={isLoading}
          loadingText="Signing in..."
          disabled={!!lockedUntil}
        >
          Sign In
        </LoadingButton>
      </form>
    </Form>
  )
}