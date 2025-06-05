'use client'

import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">
            Błąd autoryzacji
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Wystąpił problem podczas logowania przez Google.
          </p>
          
          <div className="mt-6 space-y-3">
            <Link
              href="/"
              className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Wróć do strony głównej
            </Link>
            
            <Link
              href="/test-auth"
              className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Spróbuj zalogować się emailem
            </Link>
          </div>
          
          <div className="mt-8 text-xs text-gray-500">
            <p>Możliwe przyczyny:</p>
            <ul className="mt-2 text-left list-disc list-inside">
              <li>Nieprawidłowa konfiguracja Google OAuth</li>
              <li>Zablokowane ciasteczka w przeglądarce</li>
              <li>Nieprawidłowy redirect URL</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}