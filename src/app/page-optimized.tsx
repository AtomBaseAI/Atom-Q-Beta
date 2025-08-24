"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { toasts } from "@/lib/toasts"
import HexagonLoader from "@/components/Loader/Loading"
import { LoginFormOptimized } from "@/components/forms/login-form-optimized"
import { useUserStore } from "@/stores/user"

function LoginPageOptimized() {
  const [error, setError] = useState("")
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const { user } = useUserStore()

  useEffect(() => {
    const maintenanceError = searchParams.get('error')
    if (maintenanceError === 'maintenance') {
      setError("Site is under maintenance. Only administrators can login.")
    }
  }, [searchParams])

  // Redirect based on role when session is available
  useEffect(() => {
    if (session) {
      if (session.user.role === 'ADMIN') {
        router.push("/admin")
      } else {
        router.push("/user")
      }
    }
  }, [session, router])

  // Also redirect if user is in store (client-side caching)
  useEffect(() => {
    if (!session && user?.role) {
      if (user.role === 'ADMIN') {
        router.push("/admin")
      } else {
        router.push("/user")
      }
    }
  }, [user, session, router])

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  const handleLoginSuccess = () => {
    // The redirect will be handled by the useEffect hooks
  }

  const handleLoginError = (errorMessage: string) => {
    // Error is already handled by the form component
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Atom Q</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <LoginFormOptimized 
            onSuccess={handleLoginSuccess}
            onError={handleLoginError}
          />
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-0">
          <div className="text-center text-sm">
            Don't have an account?{" "}
            <a href="/register" className="text-primary hover:underline">
              Sign up
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function HomePageOptimized() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[80vh] "><HexagonLoader size={80} /></div>}>
      <LoginPageOptimized />
    </Suspense>
  )
}