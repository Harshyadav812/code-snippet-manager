'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { toggleVote } from '@/lib/supabase'

export default function SnippetCard({ snippet, onVoteUpdate, showVoteButton = true }) {
  const { user, isAuthenticated } = useAuth()
  const [isVoting, setIsVoting] = useState(false)
  const [showFullCode, setShowFullCode] = useState(false)

  const handleVote = async () => {
    if (!isAuthenticated || !user) return

    try {
      setIsVoting(true)
      await toggleVote(snippet.snippet_id, user.id)
      onVoteUpdate?.()
    } catch (error) {
      console.error('Error voting:', error)
    } finally {
      setIsVoting(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const truncateCode = (code, maxLines = 10) => {
    const lines = code.split('\n')
    if (lines.length <= maxLines) return code
    return lines.slice(0, maxLines).join('\n') + '\n...'
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code)
      // You can add a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {snippet.title}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            by <span className="font-medium">{snippet.author}</span>
          </p>
          {snippet.description && (
            <p className="text-sm text-gray-700 mb-3">
              {snippet.description}
            </p>
          )}
        </div>

        {/* Vote Button */}
        {showVoteButton && isAuthenticated && (
          <button
            onClick={handleVote}
            disabled={isVoting}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${snippet.user_has_upvoted
                ? 'bg-blue-50 text-blue-600'
                : 'hover:bg-gray-50 text-gray-600'
              } ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg
              className={`w-5 h-5 ${snippet.user_has_upvoted ? 'fill-current' : ''}`}
              fill={snippet.user_has_upvoted ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            <span className="text-xs font-medium">{snippet.upvotes || 0}</span>
          </button>
        )}

        {/* Just show vote count for non-authenticated users */}
        {!isAuthenticated && (
          <div className="flex flex-col items-center p-2 text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            <span className="text-xs font-medium">{snippet.upvotes || 0}</span>
          </div>
        )}
      </div>


      <div className="relative">
        <pre className="bg-gray-50 rounded-md p-4 text-sm overflow-x-auto">
          <code className="text-gray-800">
            {showFullCode ? snippet.code : truncateCode(snippet.code)}
          </code>
        </pre>


        <div className="absolute top-2 right-2 flex space-x-2">
          <button
            onClick={copyToClipboard}
            className="bg-white shadow-sm border border-gray-200 p-1.5 rounded hover:bg-gray-50 transition-colors"
            title="Copy code"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>

          {snippet.code.split('\n').length > 10 && (
            <button
              onClick={() => setShowFullCode(!showFullCode)}
              className="bg-white shadow-sm border border-gray-200 px-2 py-1 rounded text-xs hover:bg-gray-50 transition-colors"
            >
              {showFullCode ? 'Less' : 'More'}
            </button>
          )}
        </div>
      </div>

      {/* Tags */}
      {snippet.tags && snippet.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {snippet.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          {formatDate(snippet.created_at)}
        </span>

        {/* Owner actions */}
        {user?.id === snippet.user_id && (
          <div className="flex space-x-2">
            <button className="text-xs text-blue-600 hover:text-blue-700">
              Edit
            </button>
            <button className="text-xs text-red-600 hover:text-red-700">
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}