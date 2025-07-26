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

