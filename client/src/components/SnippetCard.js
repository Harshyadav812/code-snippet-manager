'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { toggleVote, deleteSnippet } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

//Prettier for code formatting
import prettier from 'prettier'

// Format code using Prettier
const formatCode = (code, language) => {
  try {
    const options = {
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      semi: true,
      singleQuote: true,
      quoteProps: 'as-needed',
      trailingComma: 'es5',
      bracketSpacing: true,
      bracketSameLine: false,
      arrowParens: 'avoid',
    }

    switch (language) {
      case 'javascript':
      case 'jsx':
        return prettier.format(code, {
          ...options,
          parser: 'babel',
          plugins: [parserBabel],
        })

      case 'typescript':
      case 'tsx':
        return prettier.format(code, {
          ...options,
          parser: 'typescript',
          plugins: [parserTypescript],
        })

      case 'html':
        return prettier.format(code, {
          ...options,
          parser: 'html',
          plugins: [parserHtml],
          htmlWhitespaceSensitivity: 'ignore',
        })

      case 'css':
        return prettier.format(code, {
          ...options,
          parser: 'css',
          plugins: [parserCss],
        })

      case 'json':
        try {
          return JSON.stringify(JSON.parse(code), null, 2)
        } catch {
          return code
        }

      case 'markdown':
        return prettier.format(code, {
          ...options,
          parser: 'markdown',
          plugins: [parserMarkdown],
          proseWrap: 'preserve',
        })

      default:
        // For languages not supported by Prettier, do basic indentation cleanup
        return cleanupIndentation(code)
    }
  } catch (error) {
    console.warn('Failed to format code with Prettier:', error)
    // Fallback to basic cleanup
    return cleanupIndentation(code)
  }
}

// Basic indentation cleanup for unsupported languages
const cleanupIndentation = (code) => {
  const lines = code.split('\n')
  let indentLevel = 0
  const indentSize = 2

  return lines
    .map(line => {
      const trimmed = line.trim()
      if (!trimmed) return ''

      // Decrease indent for closing brackets/braces
      if (trimmed.match(/^[}\])]/) || trimmed.match(/^(end|fi|done|esac)$/)) {
        indentLevel = Math.max(0, indentLevel - 1)
      }

      const formatted = ' '.repeat(indentLevel * indentSize) + trimmed

      // Increase indent for opening brackets/braces
      if (trimmed.match(/[{[\(]$/) ||
        trimmed.match(/^(if|for|while|function|def|class|try|except|finally|with|switch|case)/) ||
        trimmed.match(/:$/) && !trimmed.includes('?')) {
        indentLevel++
      }

      return formatted
    })
    .join('\n')
}

const detectLanguage = (code, tags = []) => {
  // Check tags first
  const langMap = {
    'javascript': 'javascript',
    'js': 'javascript',
    'typescript': 'typescript',
    'ts': 'typescript',
    'python': 'python',
    'py': 'python',
    'java': 'java',
    'html': 'html',
    'css': 'css',
    'react': 'jsx',
    'jsx': 'jsx',
    'tsx': 'tsx',
    'node': 'javascript',
    'nodejs': 'javascript',
    'json': 'json',
    'sql': 'sql',
    'bash': 'bash',
    'shell': 'bash',
    'php': 'php',
    'cpp': 'cpp',
    'c++': 'cpp',
    'c': 'c',
    'go': 'go',
    'rust': 'rust',
    'swift': 'swift',
    'kotlin': 'kotlin',
    'dart': 'dart',
    'ruby': 'ruby',
    'xml': 'xml'
  }

  // Check if any tag matches a language
  for (const tag of tags) {
    const normalizedTag = tag.toLowerCase()
    if (langMap[normalizedTag]) {
      return langMap[normalizedTag]
    }
  }

  // Pattern-based detection
  if (code.includes('def ') && code.includes(':')) return 'python'
  if (code.includes('public class') || code.includes('public static void')) return 'java'
  if (code.includes('<div') || code.includes('<html') || code.includes('<!DOCTYPE')) return 'html'
  if (code.includes('{') && (code.includes('color:') || code.includes('margin:') || code.includes('padding:'))) return 'css'
  if (code.includes('import React') || code.includes('from \'react\'') || code.includes('useState') || code.includes('useEffect')) return 'jsx'
  if (code.includes('const ') || code.includes('let ') || code.includes('function') || code.includes('=>')) return 'javascript'
  if (code.includes('<?php')) return 'php'
  if (code.includes('#include') && code.includes('int main')) return 'cpp'
  if (code.includes('SELECT') || code.includes('FROM') || code.includes('WHERE')) return 'sql'
  if (code.includes('package main') && code.includes('func ')) return 'go'

  return 'javascript' // default
}

export default function SnippetCard({ snippet, onVoteUpdate, showVoteButton = true }) {
  const { user, isAuthenticated } = useAuth()
  const [isVoting, setIsVoting] = useState(false)
  const [showFullCode, setShowFullCode] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const handleVote = async () => {
    if (!isAuthenticated || !user) return

    try {
      setIsVoting(true)
      await toggleVote(snippet.snippet_id, user.uid)
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

  const truncateCode = (code, maxLines = 15) => {
    const lines = code.split('\n')
    if (lines.length <= maxLines) return code
    return lines.slice(0, maxLines).join('\n') + '\n// ... (truncated)'
  }

  const copyToClipboard = async () => {
    try {

      await navigator.clipboard.writeText(snippet.code)
      setIsCopied(true)
      // Reset after 1 second
      setTimeout(() => setIsCopied(false), 1000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const removeSnippet = async () => {
    try {
      await deleteSnippet(snippet.snippet_id, user.uid)
    } catch (error) {
      console.error('Error deleting snippet', error)
    }
  }

  const router = useRouter()
  const updateSnippet = () => {
    router.push(`/edit/${snippet.snippet_id}`)
  }

  const language = detectLanguage(snippet.code, snippet.tags || [])


  const formattedCode = formatCode(snippet.code, language)
  const codeToShow = showFullCode ? formattedCode : truncateCode(formattedCode)

  const customStyle = {
    ...vscDarkPlus,
    'pre[class*="language-"]': {
      ...vscDarkPlus['pre[class*="language-"]'],
      margin: 0,
      padding: 0,
      background: 'transparent',
      fontSize: '13px',
      lineHeight: '1.4',
    },
    'code[class*="language-"]': {
      ...vscDarkPlus['code[class*="language-"]'],
      background: 'transparent',
      fontSize: '13px',
      lineHeight: '1.4',
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">

      <div className="p-4 sm:p-6">

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 space-y-3 sm:space-y-0">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-1 break-words">
              {snippet.title}
            </h3>
            <p className="text-sm text-gray-600 mb-2 break-words">
              by <span className="font-medium">{snippet.author}</span>
            </p>
            {snippet.description && (
              <p className="text-sm font-medium text-gray-900 mb-3 break-words">
                {snippet.description}
              </p>
            )}
          </div>

          {/* Vote Button - Centered on mobile */}
          <div className="flex justify-center sm:justify-end">
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
        </div>


        <div className="relative">
          {/* Header with language and actions */}
          <div className="bg-gray-800 rounded-t-lg px-3 sm:px-4 py-2 flex justify-between items-center">
            <span className="text-gray-300 text-xs font-mono uppercase tracking-wider">
              {language}
            </span>
            <div className="flex space-x-1 sm:space-x-2">
              <button
                onClick={copyToClipboard}
                className={`flex items-center space-x-1 text-gray-400 hover:text-white p-1.5 rounded hover:bg-gray-700 transition-all duration-200 ${isCopied ? 'text-green-400' : ''
                  }`}
                title={isCopied ? 'Copied!' : 'Copy code'}
              >
                {isCopied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs font-medium hidden sm:inline">Copied!</span>
                  </>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>

              {snippet.code.split('\n').length > 15 && (
                <button
                  onClick={() => setShowFullCode(!showFullCode)}
                  className="text-gray-400 hover:text-white px-2 py-1 rounded text-xs hover:bg-gray-700 transition-colors whitespace-nowrap"
                >
                  {showFullCode ? 'Less' : 'More'}
                </button>
              )}
            </div>
          </div>

          {/* Code container with horizontal scroll */}
          <div className="bg-gray-900 rounded-b-lg overflow-x-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500">
            <SyntaxHighlighter
              language={language}
              style={customStyle}
              customStyle={{
                margin: 0,
                padding: '12px',
                background: '#1e293b',
                fontSize: '13px',
                lineHeight: '1.4',
              }}
              showLineNumbers={codeToShow.split('\n').length > 5}
              lineNumberStyle={{
                color: '#64748b',
                fontSize: '11px',
                marginRight: '12px',
                userSelect: 'none'
              }}
              wrapLongLines={false}
            >
              {codeToShow}
            </SyntaxHighlighter>
          </div>
        </div>

        {/* Tags - Wrap properly on mobile */}
        {snippet.tags && snippet.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {snippet.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium break-words"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer - Stack on mobile */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 pt-4 border-t border-gray-100 space-y-2 sm:space-y-0">
          <span className="text-xs text-gray-500 text-center sm:text-left">
            {formatDate(snippet.created_at)}
          </span>

          {/* Owner actions - Center on mobile */}
          {user?.uid === snippet.user_id && (
            <div className="flex space-x-2 justify-center sm:justify-end">
              <button
                onClick={updateSnippet}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                Edit
              </button>
              <button
                onClick={removeSnippet}
                className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors">
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}