'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { signInWithEmail, signUpWithEmail, signInWithGoogle, signInAnonymously } from '@/lib/auth'
import LoadingSpinner from '@/components/LoadingSpinner'

function AuthForm() {
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const mode = searchParams.get('mode') || 'signin'
  const redirect = searchParams.get('redirect') || '/'

  const [isSignUp, setIsSignUp] = useState(mode === 'signup')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    author: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      router.push(redirect)
    }
  }, [isAuthenticated, user, router, redirect])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Email and password are required')
      return false
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return false
    }

    if (isSignUp) {
      if (!formData.author.trim()) {
        setError('Display name is required')
        return false
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setLoading(true)
      setError(null)

      let result
      if (isSignUp) {
        result = await signUpWithEmail(
          formData.email.trim(),
          formData.password,
          formData.author.trim()
        )
      } else {
        result = await signInWithEmail(
          formData.email.trim(),
          formData.password
        )
      }

      if (result.error) {
        throw new Error(result.error.message)
      }

      // Success! User will be redirected by useEffect
      if (isSignUp) {
        // For sign up, show success message
        setError(null)
        // Note: Supabase might require email confirmation
      }

    } catch (error) {
      let errorMessage = 'An error occurred'

      // Firebase-specific error handling
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'Email is already registered. Try signing in instead.'
            break
          case 'auth/weak-password':
            errorMessage = 'Password is too weak. Please choose a stronger password.'
            break
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.'
            break
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email. Please sign up first.'
            break
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password. Please try again.'
            break
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please try again later.'
            break
          default:
            errorMessage = error.message || 'Authentication failed'
        }
      } else {
        errorMessage = error.message || 'Authentication failed'
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await signInWithGoogle()
      if (error) throw error

      // The redirect will happen automatically
      // No need to manually redirect here as OAuth handles it
    } catch (error) {
      let errorMessage = 'Failed to sign in with Google'

      if (error.code) {
        switch (error.code) {
          case 'auth/popup-closed-by-user':
            errorMessage = 'Sign-in cancelled. Please try again.'
            break
          case 'auth/popup-blocked':
            errorMessage = 'Popup blocked. Please enable popups and try again.'
            break
          case 'auth/cancelled-popup-request':
            errorMessage = 'Sign-in cancelled. Please try again.'
            break
          default:
            errorMessage = error.message || 'Failed to sign in with Google'
        }
      }

      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleAnonymousSignIn = async () => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await signInAnonymously()
      if (error) throw error

      // Success! User will be redirected by useEffect
    } catch (error) {
      setError(error.message || 'Failed to sign in anonymously')
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setError(null)
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      author: ''
    })
  }

  if (isAuthenticated) {
    return <LoadingSpinner text="Redirecting..." />
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">&lt;/&gt;</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isSignUp
              ? 'Join the developer community'
              : 'Welcome back to SnippetHub'
            }
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-6 flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {loading ? 'Please wait...' : `Continue with Google`}
        </button>

        {/* Divider */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name (Sign Up Only) */}
          {isSignUp && (
            <div>
              <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                id="author"
                name="author"
                value={formData.author}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                placeholder="Your display name"
                required
                disabled={loading}
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
              placeholder="your@email.com"
              required
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
              placeholder="Enter your password"
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          {/* Confirm Password (Sign Up Only) */}
          {isSignUp && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                placeholder="Confirm your password"
                required
                disabled={loading}
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isSignUp ? 'Creating Account...' : 'Signing In...'}
              </div>
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>
        </div>

        {/* Anonymous Sign In */}
        <button
          onClick={handleAnonymousSignIn}
          disabled={loading}
          className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-6"
        >
          {loading ? 'Please wait...' : '🎭 Try Anonymously'}
        </button>

        {/* Toggle Mode */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {isSignUp ? 'Already have an account?' : 'Need an account?'}
            {' '}
            <button
              type="button"
              onClick={toggleMode}
              disabled={loading}
              className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading authentication..." />}>
      <AuthForm />
    </Suspense>
  )
}