import type React from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '../stores/appStore'

export const RegisterPage = () => {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Use individual selectors to avoid infinite loops
  const login = useAppStore(state => state.login)
  const isLoading = useAppStore(state => state.isLoading)
  const setIsLoading = useAppStore(state => state.setIsLoading)

  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // setError(""); // This line was removed as per the new_code
    // setSuccess(""); // This line was removed as per the new_code

    try {
      // Call the backend API to register the user
      // const response = await authApi.register({ // This line was removed as per the new_code
      //   username, // This line was removed as per the new_code
      //   email, // This line was removed as per the new_code
      //   password // This line was removed as per the new_code
      // }); // This line was removed as per the new_code

      // Use Zustand store to handle login
      // login(response.user, response.token); // This line was removed as per the new_code

      // setSuccess(`Welcome ${response.user.username}! Registration successful!`); // This line was removed as per the new_code

      // Redirect to home page after 2 seconds
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (err: any) {
      // setError(err.message || 'Registration failed. Please try again.'); // This line was removed as per the new_code
      toast({
        title: err.message || 'Registration failed. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center justify-center gap-3">
          🌸 Fragrance Battle AI
        </h1>
        <p className="text-lg text-muted-foreground">
          Discover, compare, and battle your favorite fragrances
        </p>
      </div>

      {/* Register Form */}
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Join the fragrance community and start your journey</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* error && ( // This block was removed as per the new_code
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
              <span>⚠️</span>
              {error}
            </div>
          ) */}

          {/* success && ( // This block was removed as per the new_code
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
              <span>✅</span>
              {success}
            </div>
          ) */}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Choose a username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Create a strong password"
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full" size="lg">
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>✨ Create Account</>
              )}
            </Button>
          </form>

          {/* Navigation to Login */}
          <div className="pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground mb-2">Already have an account?</p>
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Sign in to your account ←
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center mt-8 text-xs text-muted-foreground">
        <p>© 2024 Fragrance Battle AI • Discover your perfect scent</p>
      </div>
    </div>
  )
}
