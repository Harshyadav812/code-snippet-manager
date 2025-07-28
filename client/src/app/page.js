'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getSnippetsWithVoteStatus, getAllSnippets, signInAnonymously } from '@/lib/auth'
import SnippetCard from '@/components/SnippetCard'
import SearchBar from '@/components/SearchBar'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function Home() {
  const { user, isAuthenticated } = useAuth()
  const [snippets, setSnippets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadSnippets = useCallback(async () => {
    try {
      setLoading(true)
      let data, error

      if (user) {
        // Get snippets with user vote status
        const result = await getSnippetsWithVoteStatus(user?.uid, 50, 0)
        data = result.data
        error = result.error
      } else {
        // Get all snippets without vote status
        const result = await getAllSnippets(50, 0)
        data = result.data
        error = result.error
      }

      if (error) throw error
      setSnippets(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadSnippets()
  }, [loadSnippets])

  const handleSearch = (searchResults) => {
    setSnippets(searchResults)
  }

  const handleTryAnonymous = async () => {
    try {
      const { error } = await signInAnonymously()
      if (error) throw error
      // User will be automatically updated via AuthContext
    } catch (err) {
      setError(err.message)
    }
  }

  const handleVoteUpdate = () => {
    loadSnippets()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero Section - Mobile optimized */}
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 px-2">
          Discover Amazing Code Snippets
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 px-2">
          Share, discover, and vote on useful code snippets from the developer community
        </p>

        {!isAuthenticated && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 mx-2 sm:mx-0">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Want to create and vote on snippets?
            </h3>
            <p className="text-blue-700 mb-4 text-sm sm:text-base">
              Try our app instantly without signing up, or create a full account to save your work
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleTryAnonymous}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base"
              >
                Try Anonymously
              </button>
              <a
                href="/auth?mode=signup"
                className="bg-white text-blue-600 border border-blue-600 px-6 py-2 rounded-md hover:bg-blue-50 transition-colors text-sm sm:text-base"
              >
                Create Account
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-6 px-2 sm:px-0">
        <SearchBar onSearch={handleSearch} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 mx-2 sm:mx-0 text-sm sm:text-base">
          {error}
        </div>
      )}

      {/* Responsive Grid - Single column on mobile, responsive on larger screens */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {snippets.length > 0 ? (
          snippets.map((snippet) => (
            <SnippetCard
              key={snippet.snippet_id}
              snippet={snippet}
              onVoteUpdate={handleVoteUpdate}
              showVoteButton={isAuthenticated}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12 px-4">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No snippets found</h3>
            <p className="text-gray-600 text-sm sm:text-base">
              {isAuthenticated
                ? "Be the first to create a code snippet!"
                : "Sign in to create and share your first snippet!"
              }
            </p>
          </div>
        )}
      </div>

      {snippets.length >= 50 && (
        <div className="text-center mt-8 px-2 sm:px-0">
          <button className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors text-sm sm:text-base">
            Load More
          </button>
        </div>
      )}
    </div>
  )
}