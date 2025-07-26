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
CREATE INDEX idx_snippet_votes_created_at ON snippet_votes(created_at);
CREATE INDEX idx_snippets_tags_gin ON snippets USING GIN (tags);

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

CREATE OR REPLACE FUNCTION get_snippets_with_user_vote_status(
    current_user_id UUID,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    snippet_id UUID,
    title VARCHAR(200),
    description TEXT,
    code TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE,
    user_id UUID,
    author VARCHAR(100),
    email VARCHAR(255),
    upvotes BIGINT,
    user_has_upvoted BOOLEAN
) 
LANGUAGE sql
AS $$
    SELECT 
        s.snippet_id,
        s.title,
        s.description,
        s.code,
        s.tags,
        s.created_at,
        s.user_id,
        s.author,
        s.email,
        s.upvotes,
        CASE WHEN uv.vote_id IS NOT NULL THEN true ELSE false END as user_has_upvoted
    FROM snippets_with_details s
    LEFT JOIN snippet_votes uv ON s.snippet_id = uv.snippet_id AND uv.user_id = current_user_id
    ORDER BY s.upvotes DESC, s.created_at DESC
    LIMIT limit_count OFFSET offset_count;
$$;

-- Function to get all unique tags
CREATE OR REPLACE FUNCTION get_all_unique_tags()
RETURNS TABLE (tag TEXT, count BIGINT)
LANGUAGE sql
AS $$
    SELECT 
        unnest(tags) as tag,
        COUNT(*) as count
    FROM snippets 
    WHERE tags IS NOT NULL 
    GROUP BY unnest(tags)
    ORDER BY count DESC, tag ASC;
$$;

-- Function to get trending snippets (most voted in recent days)
CREATE OR REPLACE FUNCTION get_trending_snippets(
    days_back INTEGER DEFAULT 7,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    snippet_id UUID,
    title VARCHAR(200),
    description TEXT,
    code TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE,
    user_id UUID,
    author VARCHAR(100),
    email VARCHAR(255),
    recent_upvotes BIGINT,
    total_upvotes BIGINT
)
LANGUAGE sql
AS $$
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
        COUNT(sv_recent.vote_id) as recent_upvotes,
        COUNT(sv_all.vote_id) as total_upvotes
    FROM snippets s
    JOIN users u ON s.user_id = u.user_id
    LEFT JOIN snippet_votes sv_recent ON s.snippet_id = sv_recent.snippet_id 
        AND sv_recent.created_at >= NOW() - INTERVAL '1 day' * days_back
    LEFT JOIN snippet_votes sv_all ON s.snippet_id = sv_all.snippet_id
    GROUP BY s.snippet_id, s.title, s.description, s.code, s.tags, s.created_at, s.user_id, u.author, u.email
    HAVING COUNT(sv_recent.vote_id) > 0
    ORDER BY recent_upvotes DESC, total_upvotes DESC, s.created_at DESC
    LIMIT limit_count;
$$;


-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(user_id UUID)
RETURNS TABLE (
    total_snippets BIGINT,
    total_upvotes_received BIGINT,
    total_upvotes_given BIGINT,
    most_popular_snippet_id UUID,
    most_popular_snippet_title VARCHAR(200),
    most_popular_snippet_upvotes BIGINT,
    join_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
AS $$
    WITH user_snippet_stats AS (
        SELECT 
            COUNT(s.snippet_id) as snippet_count,
            COALESCE(SUM(upvotes.vote_count), 0) as total_received_upvotes
        FROM snippets s
        LEFT JOIN (
            SELECT snippet_id, COUNT(*) as vote_count
            FROM snippet_votes
            GROUP BY snippet_id
        ) upvotes ON s.snippet_id = upvotes.snippet_id
        WHERE s.user_id = get_user_stats.user_id
    ),
    user_voting_stats AS (
        SELECT COUNT(*) as given_upvotes
        FROM snippet_votes sv
        WHERE sv.user_id = get_user_stats.user_id
    ),
    most_popular AS (
        SELECT 
            s.snippet_id,
            s.title,
            COUNT(sv.vote_id) as upvote_count
        FROM snippets s
        LEFT JOIN snippet_votes sv ON s.snippet_id = sv.snippet_id
        WHERE s.user_id = get_user_stats.user_id
        GROUP BY s.snippet_id, s.title
        ORDER BY upvote_count DESC, s.created_at DESC
        LIMIT 1
    ),
    user_info AS (
        SELECT created_at as join_date
        FROM users u
        WHERE u.user_id = get_user_stats.user_id
    )
    SELECT 
        uss.snippet_count,
        uss.total_received_upvotes,
        uvs.given_upvotes,
        mp.snippet_id,
        mp.title,
        mp.upvote_count,
        ui.join_date
    FROM user_snippet_stats uss
    CROSS JOIN user_voting_stats uvs
    LEFT JOIN most_popular mp ON true
    LEFT JOIN user_info ui ON true;
$$;

-- Function to get popular tags with counts
CREATE OR REPLACE FUNCTION get_popular_tags(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (tag TEXT, snippet_count BIGINT, total_upvotes BIGINT)
LANGUAGE sql
AS $$
    SELECT 
        unnest(s.tags) as tag,
        COUNT(DISTINCT s.snippet_id) as snippet_count,
        COUNT(sv.vote_id) as total_upvotes
    FROM snippets s
    LEFT JOIN snippet_votes sv ON s.snippet_id = sv.snippet_id
    WHERE s.tags IS NOT NULL 
    GROUP BY unnest(s.tags)
    ORDER BY total_upvotes DESC, snippet_count DESC
    LIMIT limit_count;
$$;