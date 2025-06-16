'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context-v2'
import { AuthModal } from './auth-modal'
import { toast } from '@/lib/toast'

export function Header() {
  const { user, signOut, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  
  const userMenuRef = useRef<HTMLDivElement>(null)

  const handleAuthClick = (mode: 'login' | 'register') => {
    setAuthMode(mode)
    setShowAuthModal(true)
  }

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      const result = await signOut()
      
      if (result.error) {
        console.error('Sign out error:', result.error)
        toast.error('Błąd podczas wylogowywania')
      } else {
        toast.success('Wylogowano pomyślnie')
      }
      
      setShowUserMenu(false)
    } catch (error) {
      console.error('Unexpected sign out error:', error)
      toast.error('Nieoczekiwany błąd')
    } finally {
      setIsSigningOut(false)
    }
  }

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscKey)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [showUserMenu])

  // Close user menu when user changes
  useEffect(() => {
    if (!user) {
      setShowUserMenu(false)
    }
  }, [user])

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <h1 className="text-3xl font-bold text-gray-900">
                Agregator Wydarzeń dla Dzieci
              </h1>
            </Link>
            
            <div className="flex items-center gap-4">
              {loading ? (
                <div className="w-8 h-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              ) : user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 rounded-md hover:bg-gray-50 transition-colors"
                    aria-expanded={showUserMenu}
                    aria-haspopup="true"
                    aria-label="Menu użytkownika"
                  >
                    <div className="relative">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {user.email?.[0]?.toUpperCase() || '?'}
                      </div>
                    </div>
                    <span className="hidden sm:block truncate max-w-32">
                      {user.email}
                    </span>
                    <svg 
                      className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-50">
                      <div className="py-1" role="menu" aria-orientation="vertical">
                        <Link
                          href="/add-event"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          role="menuitem"
                          onClick={() => setShowUserMenu(false)}
                        >
                          📝 Dodaj wydarzenie
                        </Link>
                        <Link
                          href="/favorites"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          role="menuitem"
                          onClick={() => setShowUserMenu(false)}
                        >
                          ❤️ Ulubione
                        </Link>
                        <Link
                          href="/alerts"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          role="menuitem"
                          onClick={() => setShowUserMenu(false)}
                        >
                          🔔 Alerty
                        </Link>
                        <Link
                          href="/my-events"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          role="menuitem"
                          onClick={() => setShowUserMenu(false)}
                        >
                          📅 Moje wydarzenia
                        </Link>
                        <Link
                          href="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          role="menuitem"
                          onClick={() => setShowUserMenu(false)}
                        >
                          👤 Profil
                        </Link>
                        <hr className="my-1" />
                        <button
                          onClick={handleSignOut}
                          disabled={isSigningOut}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          role="menuitem"
                        >
                          {isSigningOut ? (
                            <>🔄 Wylogowywanie...</>
                          ) : (
                            <>🚪 Wyloguj się</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAuthClick('login')}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    🔑 Zaloguj się
                  </button>
                  <button
                    onClick={() => handleAuthClick('register')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    ✨ Zarejestruj się
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authMode}
      />
    </>
  )
}