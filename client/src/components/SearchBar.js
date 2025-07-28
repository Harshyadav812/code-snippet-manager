'use client'

import { useState } from 'react'
import { searchSnippets, getSnippetsByTag, getAllSnippets } from '@/lib/auth'

export default function SearchBar({ onSearch }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchType, setSearchType] = useState('all') // 'all', 'search', 'tag'

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchTerm.trim() && searchType !== 'all') return

    try {
      setIsSearching(true)
      let result

      if (searchType === 'all' || !searchTerm.trim()) {
        result = await getAllSnippets()
      } else if (searchType === 'tag') {
        result = await getSnippetsByTag(searchTerm.trim().toLowerCase())
      } else {
        result = await searchSnippets(searchTerm.trim())
      }

      if (result.error) throw result.error

      // Call the parent's onSearch callback - parent should update its state
      if (onSearch) {
        onSearch(result.data || [])
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleClear = async () => {
    setSearchTerm('')
    setSearchType('all')
    try {
      setIsSearching(true)
      const result = await getAllSnippets()
      if (result.error) throw result.error
      onSearch?.(result.data || [])
    } catch (error) {
      console.error('Error loading snippets:', error)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="mb-8">
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        {/* Search Type Selector */}
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          className="px-3 py-2 border border-gray-800 rounded-md focus:outline-black focus:ring-2 focus:ring-blue-500 focus:border-black text-gray-800"
        >
          <option value="all">All Snippets</option>
          <option value="search">Search Text</option>
          <option value="tag">By Tag</option>
        </select>

        {/* Search Input */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              searchType === 'tag'
                ? 'Enter tag name (e.g., react, python)...'
                : searchType === 'search'
                  ? 'Search in titles and descriptions...'
                  : 'Browse all snippets'
            }
            disabled={searchType === 'all'}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-black"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSearching || (searchType !== 'all' && !searchTerm.trim())}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSearching ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Searching...
              </div>
            ) : (
              'Search'
            )}
          </button>

          {(searchTerm || searchType !== 'all') && (
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {searchType !== 'all' && (
        <div className="mt-3 text-sm text-gray-600">
          {searchType === 'tag' && (
            <p>💡 <strong>Tip:</strong> Search for tags like &quot;react&quot;, &quot;python&quot;, &quot;javascript&quot;, &quot;api&quot;, etc.</p>
          )}
          {searchType === 'search' && (
            <p>💡 <strong>Tip:</strong> Search in snippet titles and descriptions</p>
          )}
        </div>
      )}
    </div>
  )
}