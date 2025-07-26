CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE snippets (
    snippet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    code TEXT NOT NULL,
    tags TEXT[],
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT Now()
);

CREATE TABLE snippet_votes (
    vote_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snippet_id UUID NOT NULL REFERENCES snippets(snippet_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(snippet_id, user_id)
);

CREATE INDEX idx_snippets_user_id ON snippets(user_id);
CREATE INDEX idx_snippets_created_at ON snippets(created_at DESC);
CREATE INDEX idx_snippet_votes_snippet_id ON snippet_votes(snippet_id);
CREATE INDEX idx_snippet_votes_user_id ON snippet_votes(user_id);

CREATE VIEW snippets_with_details AS
SELECT 
    s.snippet_id,
    s.title,
    s.description,
    s.code,
    s.tags,
    s.created_at,
    s.user_id,
    u.author,
    u.email,
    COUNT(sv.vote_id) as upvotes
FROM snippets s
JOIN users u ON s.user_id = u.user_id
LEFT JOIN snippet_votes sv ON s.snippet_id = sv.snippet_id
GROUP BY s.snippet_id, s.title, s.description, s.code, s.tags, s.created_at, s.user_id, u.author, u.email
ORDER BY COUNT(sv.vote_id) DESC, s.created_at DESC;