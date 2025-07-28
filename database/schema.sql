
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (stores Firebase user data)
CREATE TABLE users (
    user_id TEXT PRIMARY KEY, -- Firebase UID
    author TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Snippets table
CREATE TABLE snippets (
    snippet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    code TEXT NOT NULL,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Snippet votes table (upvotes only)
CREATE TABLE snippet_votes (
    vote_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snippet_id UUID NOT NULL REFERENCES snippets(snippet_id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(snippet_id, user_id) -- One vote per user per snippet
);


-- Indexes for common queries
CREATE INDEX idx_snippets_user_id ON snippets(user_id);
CREATE INDEX idx_snippets_created_at ON snippets(created_at DESC);
CREATE INDEX idx_snippets_title ON snippets USING gin(to_tsvector('english', title));
CREATE INDEX idx_snippets_description ON snippets USING gin(to_tsvector('english', description));
CREATE INDEX idx_snippets_tags ON snippets USING gin(tags);
CREATE INDEX idx_snippet_votes_snippet_id ON snippet_votes(snippet_id);
CREATE INDEX idx_snippet_votes_user_id ON snippet_votes(user_id);

-- View that joins snippets with user info and vote counts
CREATE VIEW snippets_with_details AS
SELECT 
    s.snippet_id,
    s.user_id,
    s.title,
    s.description,
    s.code,
    s.tags,
    s.created_at,
    s.updated_at,
    u.author,
    u.email,
    COALESCE(v.upvotes, 0) as upvotes
FROM snippets s
LEFT JOIN users u ON s.user_id = u.user_id
LEFT JOIN (
    SELECT 
        snippet_id, 
        COUNT(*) as upvotes
    FROM snippet_votes 
    GROUP BY snippet_id
) v ON s.snippet_id = v.snippet_id;


-- Drop existing functions if they exist (to avoid conflicts)
DROP FUNCTION IF EXISTS get_snippets_with_user_vote_status(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_popular_tags(INTEGER);
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Function to get snippets with user vote status
CREATE OR REPLACE FUNCTION get_snippets_with_user_vote_status(
    p_current_user_id TEXT DEFAULT NULL,
    p_limit_count INTEGER DEFAULT 50,
    p_offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    snippet_id UUID,
    user_id TEXT,
    title TEXT,
    description TEXT,
    code TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    author TEXT,
    email TEXT,
    upvotes BIGINT,
    user_has_upvoted BOOLEAN
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.snippet_id,
        s.user_id,
        s.title,
        s.description,
        s.code,
        s.tags,
        s.created_at,
        s.updated_at,
        u.author,
        u.email,
        COALESCE(vote_counts.upvotes, 0) as upvotes,
        CASE 
            WHEN p_current_user_id IS NULL THEN FALSE
            WHEN user_votes.vote_id IS NOT NULL THEN TRUE
            ELSE FALSE
        END as user_has_upvoted
    FROM snippets s
    LEFT JOIN users u ON s.user_id = u.user_id
    LEFT JOIN (
        SELECT 
            sv.snippet_id, 
            COUNT(*) as upvotes
        FROM snippet_votes sv
        GROUP BY sv.snippet_id
    ) vote_counts ON s.snippet_id = vote_counts.snippet_id
    LEFT JOIN snippet_votes user_votes ON s.snippet_id = user_votes.snippet_id 
        AND user_votes.user_id = p_current_user_id
    ORDER BY s.created_at DESC
    LIMIT p_limit_count
    OFFSET p_offset_count;
END;
$$;

-- Function to get popular tags
CREATE OR REPLACE FUNCTION get_popular_tags(p_limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    tag TEXT,
    count BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        unnest(s.tags) as tag,
        COUNT(*) as count
    FROM snippets s
    WHERE s.tags IS NOT NULL
    GROUP BY unnest(s.tags)
    ORDER BY count DESC, tag ASC
    LIMIT p_limit_count;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Trigger to automatically update updated_at for users
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at for snippets
CREATE TRIGGER update_snippets_updated_at 
    BEFORE UPDATE ON snippets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Since we're using Firebase Auth (not Supabase Auth), 
-- RLS policies won't work. Security is handled in the application layer.

-- Ensure RLS is disabled on all tables (it's disabled by default)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE snippets DISABLE ROW LEVEL SECURITY;
ALTER TABLE snippet_votes DISABLE ROW LEVEL SECURITY;


-- Grant usage on sequences (for auto-generated IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT ALL ON users TO anon, authenticated;
GRANT ALL ON snippets TO anon, authenticated;
GRANT ALL ON snippet_votes TO anon, authenticated;

-- Grant permissions on views
GRANT SELECT ON snippets_with_details TO anon, authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_snippets_with_user_vote_status(TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_popular_tags(INTEGER) TO anon, authenticated;


-- Sample users (you can remove this section if you don't want sample data)
INSERT INTO users (user_id, author, email) VALUES 
('sample-user-1', 'John Doe', 'john@example.com'),
('sample-user-2', 'Jane Smith', 'jane@example.com');

-- Sample snippets
INSERT INTO snippets (user_id, title, description, code, tags) VALUES
('sample-user-1', 'React useState Hook', 'Basic useState example for state management', 
'import { useState } from ''react'';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}

export default Counter;', 
ARRAY['react', 'hooks', 'useState', 'javascript']),

('sample-user-2', 'Python List Comprehension', 'Efficient way to create lists in Python', 
'# Create a list of squares for even numbers
squares = [x**2 for x in range(10) if x % 2 == 0]
print(squares)  # Output: [0, 4, 16, 36, 64]

# Filter and transform data
names = [''alice'', ''bob'', ''charlie'', ''diana'']
uppercase_long_names = [name.upper() for name in names if len(name) > 4]
print(uppercase_long_names)  # Output: [''ALICE'', ''CHARLIE'', ''DIANA'']', 
ARRAY['python', 'list-comprehension', 'loops', 'filtering']);

-- Sample votes
INSERT INTO snippet_votes (snippet_id, user_id) 
SELECT s.snippet_id, 'sample-user-1' 
FROM snippets s 
WHERE s.user_id = 'sample-user-2';

INSERT INTO snippet_votes (snippet_id, user_id) 
SELECT s.snippet_id, 'sample-user-2' 
FROM snippets s 
WHERE s.user_id = 'sample-user-1';

-- 
-- This schema includes:
-- Users table with Firebase UID as TEXT primary key
-- Snippets table with UUID primary key
-- Snippet votes table for upvoting
-- Proper indexes for performance
-- View for snippets with details
-- Function for getting snippets with user vote status
-- Function for getting popular tags
-- Triggers for timestamp updates
-- Sample data for testing
-- NO RLS policies (since using Firebase Auth)
-- 
-- Security is handled at the application layer through Firebase Auth.
