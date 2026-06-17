import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useSessionStore } from '@/stores'
import { Mail, Lock, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [authMethod, setAuthMethod] = useState<'magic' | 'password'>('magic')

  const navigate = useNavigate()
  const { isAuthenticated } = useSessionStore()

  if (isAuthenticated) {
    navigate('/')
    return null
  }

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error('Enter email')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      })

      if (error) throw error

      toast.success('Magic link sent')
      setEmail('')
    } catch {
      toast.error('Failed to send link')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error('Fill all fields')
      return
    }

    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        })

        if (error) throw error

        toast.success('Check email to confirm')
        setIsSignUp(false)
        setPassword('')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        toast.success('Signed in')
        setPassword('')
      }
    } catch {
      toast.error('Auth failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="relative w-full max-w-sm px-4">
        {/* Modern branding header */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 mb-4 shadow-lg shadow-accent/10">
            <Sparkles className="w-8 h-8 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
              Consensus
            </h1>
            <p className="text-sm text-text-secondary">
              {isSignUp ? 'Create your account to get started' : 'Welcome back. Sign in to continue'}
            </p>
          </div>
        </div>

        {/* Modern card with glassmorphism */}
        <Card className="border border-border/50 bg-surface/95 backdrop-blur-xl shadow-2xl shadow-black/50">
          <CardContent className="p-8 space-y-6">
            {/* Auth method switch */}
            <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as any)} className="w-full">
              <TabsList className="grid grid-cols-2 h-12 w-full bg-transparent border-0 shadow-none p-1 gap-2">
                <TabsTrigger
                  value="magic"
                  className="text-sm font-medium data-[state=active]:bg-surface data-[state=active]:border data-[state=active]:border-border/60 data-[state=active]:shadow-sm transition-all rounded-md"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Magic Link
                </TabsTrigger>
                <TabsTrigger
                  value="password"
                  className="text-sm font-medium data-[state=active]:bg-surface data-[state=active]:border data-[state=active]:border-border/60 data-[state=active]:shadow-sm transition-all rounded-md"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Password
                </TabsTrigger>
              </TabsList>

              {/* MAGIC LINK */}
              <TabsContent value="magic" className="space-y-6 mt-6">
                <form onSubmit={handleMagicLinkLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-text-secondary">
                      Email Address
                    </Label>

                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted group-focus-within:text-accent transition-colors" />

                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        className="pl-12 h-12 text-sm bg-surface-2/50 border-border/50 focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-text-muted/50"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-accent to-accent-hover hover:from-accent-hover hover:to-accent shadow-lg shadow-accent/25 transition-all hover:shadow-accent/40 hover:scale-[1.02]"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Sending magic link...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        Send Magic Link
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </span>
                    )}
                  </Button>

                  <div className="flex items-center justify-center space-x-2 text-xs text-text-muted">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                    <span>Password-free authentication</span>
                  </div>
                </form>
              </TabsContent>

              {/* PASSWORD */}
              <TabsContent value="password" className="space-y-6 mt-6">
                <form onSubmit={handlePasswordAuth} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-text-secondary">
                      Email Address
                    </Label>

                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted group-focus-within:text-accent transition-colors" />

                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-12 h-12 text-sm bg-surface-2/50 border-border/50 focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-text-muted/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-text-secondary">
                      Password
                    </Label>

                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted group-focus-within:text-accent transition-colors" />

                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-12 h-12 text-sm bg-surface-2/50 border-border/50 focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-text-muted/50"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-accent to-accent-hover hover:from-accent-hover hover:to-accent shadow-lg shadow-accent/25 transition-all hover:shadow-accent/40 hover:scale-[1.02]"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Processing...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        {isSignUp ? 'Create Account' : 'Sign In'}
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </span>
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp)
                      setPassword('')
                    }}
                    className="text-sm text-accent hover:text-accent-hover w-full text-center transition-colors font-medium"
                  >
                    {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
                  </button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-text-muted">
            Secure authentication powered by Supabase
          </p>
        </div>
      </div>
    </div>
  )
}