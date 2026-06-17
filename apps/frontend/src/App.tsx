import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { queryClient } from './lib/queryClient'
import { Navbar } from './components'
import { Markets, MarketDetails, Portfolio, CreateMarket, Login } from './pages'
import { DepositModal, WithdrawModal, SplitModal, MergeModal } from './components'
import { useSessionStore } from './stores'
import { Sparkles } from 'lucide-react'

function App() {
  const { isAuthenticated, isLoading, initializeAuth } = useSessionStore()

  useEffect(() => {
    initializeAuth()
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center relative overflow-hidden bg-background">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-surface to-background opacity-100" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent/3 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/2 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-gradient-to-br from-surface to-surface-elevated border border-border/50 shadow-xl animate-pulse">
            <Sparkles className="h-8 w-8 text-accent" />
          </div>
          <div className="text-text-secondary font-semibold">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen relative overflow-hidden bg-background">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-surface to-background opacity-100" />
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent/3 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/2 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

          <div className="relative z-10">
            {isAuthenticated && <Navbar />}
            <Routes>
              <Route
                path="/login"
                element={!isAuthenticated ? <Login /> : <Navigate to="/" />}
              />
              <Route
                path="/"
                element={isAuthenticated ? <Markets /> : <Navigate to="/login" />}
              />
              <Route
                path="/market/:id"
                element={isAuthenticated ? <MarketDetails /> : <Navigate to="/login" />}
              />
              <Route
                path="/portfolio"
                element={isAuthenticated ? <Portfolio /> : <Navigate to="/login" />}
              />
              <Route
                path="/create"
                element={isAuthenticated ? <CreateMarket /> : <Navigate to="/login" />}
              />
            </Routes>
            <DepositModal />
            <WithdrawModal />
            <SplitModal />
            <MergeModal />
            <Toaster position="bottom-right" theme="dark" />
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
