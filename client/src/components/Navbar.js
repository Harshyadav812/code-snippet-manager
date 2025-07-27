'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/lib/auth'
import { useState } from 'react'

export default function Navbar() {
  const { user, profile, isAuthenticated, isAnonymous } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const handleSignOut = async () => {
    await signOut()
    setIsMenuOpen(false)
  }



  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">

          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">&lt;/&gt;</span>
            </div>
            <span className="text-xl font-bold text-gray-900">SnippetHub</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
              Browse
            </Link>

            {isAuthenticated && (
              <>
                <Link href="/create" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Create
                </Link>
                <Link href="/my-snippets" className="text-gray-600 hover:text-gray-900 transition-colors">
                  My Snippets
                </Link>
                <span className="text-m text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  Hi {user.displayName || `User`}
                </span>
              </>
            )}

            {!isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <Link href="/auth" className="text-blue-600 hover:text-blue-700 transition-colors">
                  Sign In
                </Link>
                <Link
                  href="/auth?mode=signup"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                {isAnonymous && (
                  <span className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    Anonymous
                  </span>
                )}
                <button
                  onClick={handleSignOut}
                  className="text-gray-600 hover:text-black transition-colors cursor-pointer px-3 py-1 rounded hover:shadow-sm"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-3">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Browse
              </Link>

              {isAuthenticated && (
                <>
                  <Link
                    href="/create"
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Create
                  </Link>
                  <Link
                    href="/my-snippets"
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My Snippets
                  </Link>
                </>
              )}

              {!isAuthenticated ? (
                <div className="flex flex-col space-y-2 pt-2">
                  <Link
                    href="/auth"
                    className="text-blue-600 hover:text-blue-700 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth?mode=signup"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              ) : (
                <div className="pt-2 border-t">
                  {isAnonymous && (
                    <span className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded inline-block mb-2">
                      Anonymous User
                    </span>
                  )}
                  <p className="text-sm text-gray-600 mb-2">
                    Signed in as {user.displayName || 'User'}
                  </p>
                  <button
                    onClick={handleSignOut}
                    className="text-red-600 hover:text-red-700 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}