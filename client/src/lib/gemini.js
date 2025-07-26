
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'

const callGeminiAPI = async (prompt) => {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.candidates[0]?.content?.parts[0]?.text || 'No response generated'
  } catch (error) {
    console.error('Gemini API Error:', error)
    throw new Error('Failed to get AI response. Please try again.')
  }
}

export const generateTags = async (code, title = '', description = '') => {
  const prompt = `
Analyze this code snippet and suggest 3-5 relevant tags that would help developers find it.

Title: ${title}
Description: ${description}
Code:
\`\`\`
${code}
\`\`\`

Guidelines:
- Include the programming language
- Include framework/library names if used
- Include concept/pattern names (e.g., "hooks", "async", "recursion")
- Include use case tags (e.g., "authentication", "api", "database")
- Keep tags lowercase, use hyphens for spaces
- Maximum 5 tags

Respond with ONLY a JSON array of strings, no explanation:
["tag1", "tag2", "tag3"]
`

  try {
    const response = await callGeminiAPI(prompt)
    const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim()
    const tags = JSON.parse(cleanResponse)

    if (Array.isArray(tags) && tags.length > 0) {
      return tags.slice(0, 5) // Limit to 5 tags
    }

    return []
  } catch (error) {
    console.error('Error generating tags:', error)
    return []
  }
}

export const analyzeCode = async (code, language = '') => {
  const prompt = `
Analyze this ${language} code snippet for:
1. Potential bugs or errors
2. Performance improvements
3. Best practice suggestions
4. Security concerns (if any)

Code:
\`\`\`${language}
${code}
\`\`\`

Provide your analysis in this JSON format:
{
  "issues": [
    {
      "type": "error|warning|suggestion",
      "message": "Description of the issue",
      "line": "approximate line number or 'general'",
      "severity": "high|medium|low"
    }
  ],
  "improvements": [
    "Specific improvement suggestion 1",
    "Specific improvement suggestion 2"
  ],
  "overall_rating": "excellent|good|fair|needs_work",
  "summary": "Brief overall assessment"
}

Be constructive and helpful. If the code is good, say so!
`

  try {
    const response = await callGeminiAPI(prompt)
    const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim()
    const analysis = JSON.parse(cleanResponse)

    return {
      issues: analysis.issues || [],
      improvements: analysis.improvements || [],
      overall_rating: analysis.overall_rating || 'fair',
      summary: analysis.summary || 'Code analysis completed'
    }
  } catch (error) {
    console.error('Error analyzing code:', error)
    return {
      issues: [],
      improvements: [],
      overall_rating: 'fair',
      summary: 'Unable to analyze code at this time'
    }
  }
}

export const suggestCodeImprovement = async (code, language = '') => {
  const prompt = `
Improve this ${language} code snippet by:
1. Fixing any bugs or errors
2. Adding better error handling
3. Improving performance where possible
4. Following best practices
5. Adding helpful comments

Original code:
\`\`\`${language}
${code}
\`\`\`

Respond with:
{
  "improved_code": "the improved code with comments",
  "changes_made": [
    "List of specific improvements made"
  ],
  "explanation": "Brief explanation of why these changes help"
}

Keep the core functionality the same, just make it better!
`

  try {
    const response = await callGeminiAPI(prompt)
    const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim()
    const improvement = JSON.parse(cleanResponse)

    return {
      improved_code: improvement.improved_code || code,
      changes_made: improvement.changes_made || [],
      explanation: improvement.explanation || 'No improvements suggested'
    }
  } catch (error) {
    console.error('Error improving code:', error)
    return {
      improved_code: code,
      changes_made: [],
      explanation: 'Unable to suggest improvements at this time'
    }
  }
}

export const detectLanguage = async (code) => {
  const prompt = `
Identify the programming language of this code snippet:

\`\`\`
${code}
\`\`\`

Respond with ONLY the language name in lowercase (e.g., "javascript", "python", "java", "css", "html").
If unsure, respond with "unknown".
`

  try {
    const response = await callGeminiAPI(prompt)
    return response.trim().toLowerCase()
  } catch (error) {
    console.error('Error detecting language:', error)
    return 'unknown'
  }
}

export const generateTitleAndDescription = async (code) => {
  const prompt = `
Analyze this code snippet and suggest:
1. A concise, descriptive title (max 50 characters)
2. A helpful description (max 150 characters)

Code:
\`\`\`
${code}
\`\`\`

Respond with:
{
  "title": "Suggested title",
  "description": "What this code does and when to use it"
}
`

  try {
    const response = await callGeminiAPI(prompt)
    const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim()
    const suggestion = JSON.parse(cleanResponse)

    return {
      title: suggestion.title || 'Code Snippet',
      description: suggestion.description || 'Useful code snippet'
    }
  } catch (error) {
    console.error('Error generating title/description:', error)
    return {
      title: 'Code Snippet',
      description: 'Useful code snippet'
    }
  }
}

let requestCount = 0
let lastResetTime = Date.now()

export const checkRateLimit = () => {
  const now = Date.now()
  const oneMinute = 60 * 1000

  if (now - lastResetTime > oneMinute) {
    requestCount = 0
    lastResetTime = now
  }

  if (requestCount >= 15) {
    throw new Error('Rate limit reached. Please wait a moment before trying again.')
  }

  requestCount++
  return true
}