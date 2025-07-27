'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    loadSnippets()
  }, [user])

  const loadSnippets = async () => {
    try {
      setLoading(true)
      let data, error

      if (user) {
        // Get snippets with user vote status
        const result = await getSnippetsWithVoteStatus(user.id)
        data = result.data
        error = result.error
      } else {
        // Get all snippets without vote status
        const result = await getAllSnippets()
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
  }

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
    // Refresh snippets when vote is updated
    loadSnippets()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Discover Amazing Code Snippets
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Share, discover, and vote on useful code snippets from the developer community
        </p>

        {!isAuthenticated && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Want to create and vote on snippets?
            </h3>
            <p className="text-blue-700 mb-4">
              Try our app instantly without signing up, or create a full account to save your work
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleTryAnonymous}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Anonymously
              </button>
              <a
                href="/auth?mode=signup"
                className="bg-white text-blue-600 border border-blue-600 px-6 py-2 rounded-md hover:bg-blue-50 transition-colors"
              >
                Create Account
              </a>
            </div>
          </div>
        )}
      </div>

      <SearchBar onSearch={handleSearch} />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
          <div className="col-span-full text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No snippets found</h3>
            <p className="text-gray-600">
              {isAuthenticated
                ? "Be the first to create a code snippet!"
                : "Sign in to create and share your first snippet!"
              }
            </p>
          </div>
        )}
      </div>

      {snippets.length >= 50 && (
        <div className="text-center mt-8">
          <button className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors">
            Load More
          </button>
        </div>
      )}
    </div>
  )
}
