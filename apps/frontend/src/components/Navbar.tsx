import { Link, useLocation } from 'react-router-dom'
import { Wallet, LogOut, User, Menu, X } from 'lucide-react'
import { useBalance } from '@/hooks'
import { useSessionStore } from '@/stores'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function Navbar() {
  const location = useLocation()
  const { data: dataBalance } = useBalance()
  const { user, logout, isAuthenticated } = useSessionStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const balance = dataBalance?.balance

  const isActive = (path: string) => location.pathname === path

  const handleLogout = async () => {
    await logout()
  }

  const navLinks = [
    { to: '/', label: 'Markets' },
    { to: '/portfolio', label: 'Portfolio' },
    { to: '/create', label: 'Create Market' },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center overflow-hidden">
            <img
              src="..\..\assets\trade-favicon.png"
              alt="Logo"
              className="h-6 w-6 object-contain"
            />
          </div>
            <span className="text-lg font-bold text-primary-text hidden sm:block gradient-text">
              Consensus
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(link.to) 
                    ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                    : 'text-secondary-text hover:text-primary-text hover:bg-surface-elevated'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-3">
            {isAuthenticated && (
              <>
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border shadow-sm hover:shadow-md transition-all duration-300">
                  <Wallet className="h-4 w-4 text-accent" />
                  <span className="text-sm font-semibold text-primary-text">
                    {balance ? formatCurrency(balance) : '$0.00'}
                  </span>
                </div>
                <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border shadow-sm">
                  <User className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium text-primary-text truncate max-w-[150px]">
                    {user?.email}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  title="Sign out"
                  className="h-9 w-9 rounded-lg hover:bg-surface-elevated"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden h-9 w-9 rounded-lg"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && isAuthenticated && (
          <div className="md:hidden py-4 border-t border-border animate-slide-up">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(link.to) 
                      ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                      : 'text-secondary-text hover:text-primary-text hover:bg-surface-elevated'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-surface-elevated border border-border">
                <div className="flex items-center space-x-2">
                  <Wallet className="h-4 w-4 text-accent" />
                  <span className="text-sm font-semibold text-primary-text">
                    {balance ? formatCurrency(balance) : '$0.00'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium text-primary-text truncate max-w-[100px]">
                    {user?.email}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
