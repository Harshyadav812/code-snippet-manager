import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const signUpWithEmail = async (email, password, author) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        author: author
      }
    }
  })

  if (data.user && !error) {
    await createUserProfile(data.user.id, author, email)
  }
  return { data, error }
}

export const signInWithEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signInAnonymously = async () => {
  const { data, error } = await supabase.auth.signInAnonymously()

  if (data.user && !error) {
    await createUserProfile(
      data.user.id,
      `Anonymous User ${data.user.id.slice(0, 6)}`,
      `anonymous-${data.user.id}@temp.com`
    )
  }
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

//user functions

export const createUserProfile = async (userId, author, email) => {
  const { data, error } = await supabase.from('users')
    .upsert([{
      user_id: userId,
      author: author,
      email: email
    }], {
      onConflict: 'user_id'
    })
    .select()

  return { data, error }
}

export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .single()

  return { data, error }
}

export const updateUserProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .explain('user_id', userId)
    .select()

  return { data, error }
}

export const createSnippet = async (snippetData) => {
  const { data, error } = await supabase
    .from('snippets')
    .insert([snippetData])
    .select()

  return { data, error }
}

export const getAllSnippets = async (limit = 50, offset = 0) => {
  const { data, error } = await supabase
    .from('snippets_with_details')
    .select('*')
    .range(offset, offset + limit - 1)

  return { data, error }
}

export const getSnippetsWithVoteStatus = async (currentUserId, limit = 50, offset = 0) => {
  const { data, error } = await supabase
    .rpc('get_snippets_with_user_vote_status', {
      current_user_id: currentUserId,
      limit_count: limit,
      offset_count: offset
    })
  return { data, error }
}

export const getSnippetById = async (snippetId) => {
  const { data, error } = await supabase
    .from('snippets_with_details')
    .select('*')
    .explain('snippet_id', snippetId)
    .single()

  return { data, error }
}

export const getUserSnippets = async (userId) => {
  const { data, error } = await supabase
    .from('snippets_with_details')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return { data, error }

}

export const updateSnippet = async (snippetId, userId, updates) => {
  const { data, error } = supabase
    .from('snippets')
    .update(updates)
    .eq('snippet_id', snippetId)
    .eq('user_id', userId)
    .select()

  return { data, error }
}

export const deleteSnippet = async (snippetId, userId) => {
  const { data, error } = await supabase
    .from('snippets')
    .delete()
    .eq('snippets_id', snippetId)
    .eq('user_id', userId)

  return { data, error }
}

export const checkUserVote = async (snippetId, userId) => {
  const { data, error } = await supabase
    .from('snippet_votes')
    .select('vote_id')
    .eq('snippet_id', snippetId)
    .eq('user_id', userId)
    .single()

  return { hasVoted: !!data, data, error }
}

export const toggleVote = async (snippetId, userId) => {
  const { hasVoted } = await checkUserVote(snippetId, userId)

  if (hasVoted) {
    const { data, error } = await supabase
      .from('snippet_vote')
      .delete()
      .eq('snippet_id', snippetId)
      .eq('user_id', userId)

    return { data, error, action: 'removed' }
  } else {
    const { data, error } = await supabase
      .from('snippet_votes')
      .insert([{
        snippet_id: snippetId,
        user_id: userId
      }])
      .select()

    return { data, error, action: 'added' }
  }

}

export const searchSnippets = async (searchTerm, limit = 50) => {
  const { data, error } = await supabase
    .from('snippets_with_details')
    .select('*')
    .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
    .limit(limit)

  return { data, error }
}

export const getSnippetsByTag = async (tag, limit = 50) => {
  const { data, error } = await supabase
    .from('snippets_with_details')
    .select('*')
    .contains('tags', [tag])
    .limit(limit)

  return { data, error }
}

export const getPopularTags = async (limit = 10) => {
  const { data, error } = await supabase
    .rpc('get_popular_tags', {
      limit_count: limit
    })

  return { data, error }
}