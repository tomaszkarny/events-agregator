'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context-v2'
import { toast } from '@/lib/toast'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultMode?: 'login' | 'register'
}

export function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
  // FIX: Define all useState BEFORE useEffect
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // FIX: Add ref to track if component is mounted
  const isMountedRef = useRef(true)
  
  const { signIn, signUp, signInWithProvider } = useAuth()

  // FIX: Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // FIX: Better logic for mode and form reset
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode)
      // Reset form only when modal opens or mode changes
      setEmail('')
      setPassword('')
      setName('')
      setError('')
      setLoading(false) // FIX: Also reset loading state
    }
  }, [isOpen, defaultMode])

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setName('')
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let result
      
      if (mode === 'login') {
        result = await signIn(email, password)
      } else {
        result = await signUp(email, password, { name })
      }

      // FIX: Check if component is still mounted before setting state
      if (!isMountedRef.current) return

      if (result.error) {
        // FIX: Better error messages
        const errorMsg = result.error.message || 'Wystąpił błąd'
        if (errorMsg.includes('Invalid login credentials')) {
          setError('Nieprawidłowy email lub hasło')
        } else if (errorMsg.includes('User already registered')) {
          setError('Użytkownik o tym emailu już istnieje')
        } else if (errorMsg.includes('Password should be at least 6 characters')) {
          setError('Hasło musi mieć minimum 6 znaków')
        } else {
          setError(errorMsg)
        }
      } else {
        // Success - close modal and reset form
        toast.success(mode === 'login' ? 'Zalogowano pomyślnie!' : 'Rejestracja zakończona! Witamy!')
        onClose()
        resetForm()
      }
    } catch (err) {
      // FIX: Check if mounted and show actual error
      if (!isMountedRef.current) return
      console.error('Auth error:', err)
      setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd')
    } finally {
      // FIX: Only set loading if component is still mounted
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  const handleModeSwitch = () => {
    const newMode = mode === 'login' ? 'register' : 'login'
    setMode(newMode)
    setError('') // Clear only error, keep form data
  }

  const handleOAuthSignIn = async (provider: 'google' | 'facebook' | 'github' | 'apple') => {
    try {
      setLoading(true)
      setError('')
      
      const { error } = await signInWithProvider(provider)
      
      if (error) {
        console.error('OAuth error:', error)
        setError(error.message || `Błąd logowania przez ${provider}`)
        toast.error(`Błąd logowania przez ${provider}`)
      }
      // Success - the OAuth provider will redirect
    } catch (error) {
      console.error('OAuth sign in error:', error)
      setError('Wystąpił błąd podczas logowania')
      toast.error('Wystąpił błąd podczas logowania')
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  // FIX: Close modal on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      // FIX: Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // IMPORTANT: This MUST be after all hooks!
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        // FIX: Close modal when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            {mode === 'login' ? 'Logowanie' : 'Rejestracja'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
            aria-label="Zamknij"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Imię *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Twoje imię"
                disabled={loading}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="twoj@email.com"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hasło *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Minimum 6 znaków"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading 
              ? (mode === 'login' ? 'Logowanie...' : 'Rejestracja...') 
              : (mode === 'login' ? 'Zaloguj się' : 'Zarejestruj się')
            }
          </button>
        </form>

        {/* OAuth Providers */}
        {true && (
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">lub kontynuuj z</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => handleOAuthSignIn('google')}
              disabled={loading}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="ml-2">Google</span>
            </button>

            <button
              onClick={() => handleOAuthSignIn('facebook')}
              disabled={loading}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="ml-2">Facebook</span>
            </button>
          </div>

          {mode === 'login' && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                onClick={() => handleOAuthSignIn('github')}
                disabled={loading}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="ml-2">GitHub</span>
              </button>

              <button
                onClick={() => handleOAuthSignIn('apple')}
                disabled={loading}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                </svg>
                <span className="ml-2">Apple</span>
              </button>
            </div>
          )}
        </div>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={handleModeSwitch}
            disabled={loading}
            className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50 transition-colors"
          >
            {mode === 'login' 
              ? 'Nie masz konta? Zarejestruj się' 
              : 'Masz już konto? Zaloguj się'
            }
          </button>
        </div>

        {mode === 'register' && (
          <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
            <strong>ℹ️ Informacja:</strong> Po rejestracji będziesz mógł dodawać wydarzenia i tworzyć alerty.
          </div>
        )}
      </div>
    </div>
  )
}