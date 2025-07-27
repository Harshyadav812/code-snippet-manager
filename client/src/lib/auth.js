import { createClient } from "@supabase/supabase-js"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously as firebaseSignInAnonymously,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from 'firebase/auth'
import { auth, googleProvider } from './firebase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Supabase client for data operations only
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Firebase handles ALL authentication
export const signUpWithEmail = async (email, password, author) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const firebaseUser = userCredential.user

    // Store user profile in Supabase using Firebase UID as primary key
    await createUserProfile(firebaseUser.uid, author, email)

    return { data: { user: firebaseUser }, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return { data: { user: userCredential.user }, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    const firebaseUser = result.user

    // Check if user profile exists, create if not
    const { data: existingProfile } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', firebaseUser.uid)
      .single()

    if (!existingProfile) {
      const author = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User'
      await createUserProfile(firebaseUser.uid, author, firebaseUser.email)
    }

    return { data: { user: firebaseUser }, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export const signInAnonymously = async () => {
  try {
    const userCredential = await firebaseSignInAnonymously(auth)
    const firebaseUser = userCredential.user

    // Create anonymous user profile
    await createUserProfile(
      firebaseUser.uid,
      `Anonymous User`,
      `anonymous-${firebaseUser.uid}@temp.com`
    )

    return { data: { user: firebaseUser }, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export const signOut = async () => {
  try {
    await firebaseSignOut(auth)
    return { error: null }
  } catch (error) {
    return { error }
  }
}

export const getCurrentUser = () => {
  return auth.currentUser
}

export const onFirebaseAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback)
}

// User functions - using Firebase UID as primary key
export const createUserProfile = async (firebaseUid, author, email) => {
  try {
    const { data, error } = await supabase.from('users')
      .upsert([{
        user_id: firebaseUid, // Use Firebase UID as primary key
        author: author,
        email: email,
        created_at: new Date().toISOString()
      }], {
        onConflict: 'user_id',
        ignoreDuplicates: false // This will update if user exists
      })
      .select()

    if (error) {
      console.error('Error creating/updating user profile:', error)
    }

    return { data, error }
  } catch (error) {
    console.error('Error in createUserProfile:', error)
    return { data: null, error }
  }
}

export const getUserProfile = async (firebaseUid) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', firebaseUid)
    .single()

  return { data, error }
}

export const updateUserProfile = async (firebaseUid, updates) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('user_id', firebaseUid)
    .select()

  return { data, error }
}

// Snippet functions - all use Firebase UID
export const createSnippet = async (snippetData) => {
  try {
    // First, ensure the user profile exists
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', snippetData.user_id)
      .single()

    // If user doesn't exist, we have a problem
    if (userCheckError && userCheckError.code === 'PGRST116') {
      // User doesn't exist - this shouldn't happen if auth flow is correct
      throw new Error('User profile not found. Please sign out and sign in again.')
    }

    // Now create the snippet
    const { data, error } = await supabase
      .from('snippets')
      .insert([snippetData])
      .select()

    return { data, error }
  } catch (error) {
    console.error('Error creating snippet:', error)
    return { data: null, error }
  }
}

export const getAllSnippets = async (limit = 50, offset = 0) => {
  const { data, error } = await supabase
    .rpc('get_snippets_with_user_vote_status', {
      p_current_user_id: null, // No user context needed for public view
      p_limit_count: limit,
      p_offset_count: offset
    })
    .order('upvotes', { ascending: false })
  return { data, error }
}

export const getSnippetsWithVoteStatus = async (currentUserId, limit = 50, offset = 0) => {
  const { data, error } = await supabase
    .rpc('get_snippets_with_user_vote_status', {
      p_current_user_id: currentUserId || null, // Handle null/undefined user
      p_limit_count: limit,
      p_offset_count: offset
    })
    .order('upvotes', { ascending: false })
  return { data, error }
}

export const getSnippetById = async (snippetId) => {
  const { data, error } = await supabase
    .from('snippets_with_details')
    .select('*')
    .eq('snippet_id', snippetId)
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
  const { data, error } = await supabase
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
    .eq('snippet_id', snippetId)
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
      .from('snippet_votes')
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
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data, error }
}

export const getSnippetsByTag = async (tag, limit = 50) => {
  const { data, error } = await supabase
    .from('snippets_with_details')
    .select('*')
    .contains('tags', [tag])
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data, error }
}

export const getPopularTags = async (limit = 10) => {
  const { data, error } = await supabase
    .rpc('get_popular_tags', {
      p_limit_count: limit
    })

  return { data, error }
}