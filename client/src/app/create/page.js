'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createSnippet } from '@/lib/auth'
import {
  generateTags,
  analyzeCode,
  suggestCodeImprovement,
  detectLanguage,
  generateTitleAndDescription,
  checkRateLimit
} from '@/lib/gemini'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function CreateSnippet() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    code: '',
    tags: []
  })

  const [tagInput, setTagInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // AI Features
  const [aiLoading, setAiLoading] = useState({
    tags: false,
    analysis: false,
    improvement: false,
    titleDesc: false
  })
  const [codeAnalysis, setCodeAnalysis] = useState(null)
  const [codeImprovement, setCodeImprovement] = useState(null)
  const [showImprovement, setShowImprovement] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth?redirect=/create')
    }
  }, [isAuthenticated, router])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAddTag = (e) => {
    e.preventDefault()
    const tag = tagInput.trim().toLowerCase()
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  // AI Features
  const handleGenerateTags = async () => {
    if (!formData.code.trim()) {
      setError('Please enter some code first')
      return
    }

    try {
      checkRateLimit()
      setAiLoading(prev => ({ ...prev, tags: true }))
      setError(null)

      const suggestedTags = await generateTags(formData.code, formData.title, formData.description)

      // Add unique tags
      const newTags = suggestedTags.filter(tag => !formData.tags.includes(tag))
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, ...newTags].slice(0, 10) // Limit to 10 tags
      }))

    } catch (error) {
      setError(error.message)
    } finally {
      setAiLoading(prev => ({ ...prev, tags: false }))
    }
  }

  const handleAnalyzeCode = async () => {
    if (!formData.code.trim()) {
      setError('Please enter some code first')
      return
    }

    try {
      checkRateLimit()
      setAiLoading(prev => ({ ...prev, analysis: true }))
      setError(null)

      const language = await detectLanguage(formData.code)
      const analysis = await analyzeCode(formData.code, language)
      setCodeAnalysis(analysis)

    } catch (error) {
      setError(error.message)
    } finally {
      setAiLoading(prev => ({ ...prev, analysis: false }))
    }
  }

  const handleImproveCode = async () => {
    if (!formData.code.trim()) {
      setError('Please enter some code first')
      return
    }

    try {
      checkRateLimit()
      setAiLoading(prev => ({ ...prev, improvement: true }))
      setError(null)

      const language = await detectLanguage(formData.code)
      const improvement = await suggestCodeImprovement(formData.code, language)
      setCodeImprovement(improvement)
      setShowImprovement(true)

    } catch (error) {
      setError(error.message)
    } finally {
      setAiLoading(prev => ({ ...prev, improvement: false }))
    }
  }

  const handleGenerateTitleDescription = async () => {
    if (!formData.code.trim()) {
      setError('Please enter some code first')
      return
    }

    try {
      checkRateLimit()
      setAiLoading(prev => ({ ...prev, titleDesc: true }))
      setError(null)

      const suggestions = await generateTitleAndDescription(formData.code)
      setFormData(prev => ({
        ...prev,
        title: suggestions.title,
        description: suggestions.description
      }))

    } catch (error) {
      setError(error.message)
    } finally {
      setAiLoading(prev => ({ ...prev, titleDesc: false }))
    }
  }

  const handleUseImprovedCode = () => {
    if (codeImprovement?.improved_code) {
      setFormData(prev => ({
        ...prev,
        code: codeImprovement.improved_code
      }))
      setShowImprovement(false)
      setCodeImprovement(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.code.trim()) {
      setError('Title and code are required')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const snippetData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        code: formData.code.trim(),
        tags: formData.tags.length > 0 ? formData.tags : null,
        user_id: user.uid
      }

      const { data, error } = await createSnippet(snippetData)

      if (error) throw error

      // Redirect to home page with success message
      router.push('/?created=true')

    } catch (error) {
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return <LoadingSpinner text="Checking authentication..." />
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Snippet</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title and Description */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600"
                placeholder="Enter snippet title..."
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600"
                placeholder="Brief description of what this code does..."
              />
            </div>
          </div>

          {/* AI Title/Description Generator */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleGenerateTitleDescription}
              disabled={aiLoading.titleDesc || !formData.code.trim()}
              className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-md hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {aiLoading.titleDesc ? '🤖 Generating...' : '🤖 Generate Title & Description'}
            </button>
          </div>

          {/* Code Editor */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-black mb-2">
              Code *
            </label>
            <textarea
              id="code"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              rows={15}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-gray-600"
              placeholder="Paste your code here..."
              required
            />
          </div>

          {/* AI Features Row */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleAnalyzeCode}
              disabled={aiLoading.analysis || !formData.code.trim()}
              className="bg-blue-100 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {aiLoading.analysis ? '🤖 Analyzing...' : '🤖 Analyze Code'}
            </button>

            <button
              type="button"
              onClick={handleImproveCode}
              disabled={aiLoading.improvement || !formData.code.trim()}
              className="bg-green-100 text-green-700 px-4 py-2 rounded-md hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {aiLoading.improvement ? '🤖 Improving...' : '🤖 Improve Code'}
            </button>

            <button
              type="button"
              onClick={handleGenerateTags}
              disabled={aiLoading.tags || !formData.code.trim()}
              className="bg-orange-100 text-orange-700 px-4 py-2 rounded-md hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {aiLoading.tags ? '🤖 Generating...' : '🤖 Generate Tags'}
            </button>
          </div>

          {/* Code Analysis Results */}
          {codeAnalysis && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">🤖 Code Analysis</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-700"><strong>Overall Rating:</strong> <span className="capitalize">{codeAnalysis.overall_rating}</span></p>
                  <p className="text-sm text-gray-700">{codeAnalysis.summary}</p>
                </div>

                {codeAnalysis.issues?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-blue-800">Issues Found:</h4>
                    <ul className="text-sm space-y-1 ml-4 text-gray-700">
                      {codeAnalysis.issues.map((issue, index) => (
                        <li key={index} className="list-disc">
                          <span className={`font-medium ${issue.severity === 'high' ? 'text-red-600' :
                            issue.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                            }`}>
                            [{issue.severity.toUpperCase()}]
                          </span> {issue.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {codeAnalysis.improvements?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-blue-800">Suggestions:</h4>
                    <ul className="text-sm space-y-1 ml-4 text-gray-700">
                      {codeAnalysis.improvements.map((improvement, index) => (
                        <li key={index} className="list-disc">{improvement}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Code Improvement Modal */}
          {showImprovement && codeImprovement && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-green-900">🤖 Improved Code</h3>
                <button
                  onClick={() => setShowImprovement(false)}
                  className="text-green-600 hover:text-green-800"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-gray-700">{codeImprovement.explanation}</p>

                {codeImprovement.changes_made?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-900">Changes Made:</h4>
                    <ul className="text-sm space-y-1 ml-4 text-gray-700">
                      {codeImprovement.changes_made.map((change, index) => (
                        <li key={index} className="list-disc">{change}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-green-800 mb-2">Improved Code:</h4>
                  <pre className="bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto max-h-64">
                    <code>{codeImprovement.improved_code}</code>
                  </pre>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleUseImprovedCode}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
                  >
                    Use This Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImprovement(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors text-sm"
                  >
                    Keep Original
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Tags (Optional)
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag(e)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600"
                placeholder="Add a tag..."
                disabled={formData.tags.length >= 10}
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || formData.tags.length >= 10}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formData.tags.length}/10 tags • Press Enter or click Add
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title.trim() || !formData.code.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Snippet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}