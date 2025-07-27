'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getUserSnippets, deleteSnippet } from '@/lib/auth'
import SnippetCard from '@/components/SnippetCard'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function MySnippets() {
  const { user, profile, isAuthenticated, isAnonymous } = useAuth()
  const router = useRouter()

  const [snippets, setSnippets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [stats, setStats] = useState({
    totalSnippets: 0,
    totalUpvotes: 0,
    mostPopular: null
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth?redirect=/my-snippets')
    }
  }, [isAuthenticated, router])

  // Load user's snippets
  useEffect(() => {
    if (user) {
      loadMySnippets()
    }
  }, [user])

  const loadMySnippets = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await getUserSnippets(user.id)

      if (error) throw error

      setSnippets(data || [])

      // Calculate stats
      if (data) {
        const totalUpvotes = data.reduce((sum, snippet) => sum + (snippet.upvotes || 0), 0)
        const mostPopular = data.reduce((max, snippet) =>
          (snippet.upvotes || 0) > (max?.upvotes || 0) ? snippet : max, null)

        setStats({
          totalSnippets: data.length,
          totalUpvotes,
          mostPopular
        })
      }

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (snippetId) => {
    if (!confirm('Are you sure you want to delete this snippet? This action cannot be undone.')) {
      return
    }

    try {
      setDeletingId(snippetId)
      const { error } = await deleteSnippet(snippetId, user.id)

      if (error) throw error

      // Remove from local state
      setSnippets(prev => prev.filter(snippet => snippet.snippet_id !== snippetId))

      // Update stats
      setStats(prev => ({
        ...prev,
        totalSnippets: prev.totalSnippets - 1
      }))

    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleEdit = (snippetId) => {
    router.push(`/edit/${snippetId}`)
  }

  if (!isAuthenticated) {
    return <LoadingSpinner text="Checking authentication..." />
  }

  if (loading) {
    return <LoadingSpinner text="Loading your snippets..." />
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Snippets</h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {profile?.author || 'Developer'}!
              {isAnonymous && (
                <span className="text-amber-600 ml-2">
                  (Anonymous Session)
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => router.push('/create')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Create New Snippet
          </button>
        </div>

        {/* Anonymous User Warning */}
        {isAnonymous && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Anonymous Session
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  Your snippets are saved for this session only. Create a permanent account to keep your work forever.
                </p>
                <div className="mt-3">
                  <button
                    onClick={() => router.push('/auth?mode=signup')}
                    className="bg-amber-600 text-white px-4 py-2 rounded-md text-sm hover:bg-amber-700 transition-colors"
                  >
                    Create Permanent Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Snippets</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSnippets}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Upvotes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUpvotes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Most Popular</p>
                <p className="text-lg font-bold text-gray-900">
                  {stats.mostPopular ? `${stats.mostPopular.upvotes} votes` : 'N/A'}
                </p>
                {stats.mostPopular && (
                  <p className="text-xs text-gray-500 truncate">
                    {stats.mostPopular.title}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Snippets Grid */}
      {snippets.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {snippets.map((snippet) => (
            <div key={snippet.snippet_id} className="relative">
              <SnippetCard
                snippet={snippet}
                onVoteUpdate={loadMySnippets}
                showVoteButton={true}
              />

              {/* Owner Actions Overlay */}
              <div className="absolute top-4 right-4 flex space-x-2">
                <button
                  onClick={() => handleEdit(snippet.snippet_id)}
                  className="bg-white shadow-sm border border-gray-200 p-2 rounded hover:bg-gray-50 transition-colors"
                  title="Edit snippet"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                <button
                  onClick={() => handleDelete(snippet.snippet_id)}
                  disabled={deletingId === snippet.snippet_id}
                  className="bg-white shadow-sm border border-gray-200 p-2 rounded hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete snippet"
                >
                  {deletingId === snippet.snippet_id ? (
                    <svg className="w-4 h-4 text-gray-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No snippets yet</h3>
          <p className="text-gray-600 mb-6">
            You haven&apos;t created any code snippets yet. Start sharing your knowledge with the community!
          </p>
          <button
            onClick={() => router.push('/create')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Your First Snippet
          </button>
        </div>
      )}
    </div>
  )
}