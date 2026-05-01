-- Migration: AI Feedback Loop (Phase 3)
-- Description: Adds a table to log user feedback on AI suggestions for future training and refinement.

CREATE TABLE IF NOT EXISTS ai_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL, -- e.g., 'prioritize', 'flight-plan', 'breakdown'
    suggestion_json JSONB NOT NULL, -- The original suggestion provided by the AI
    action TEXT NOT NULL CHECK (action IN ('accept', 'reject')),
    correction_text TEXT, -- Optional text provided by the user (e.g., 'This is too early')
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own feedback"
ON ai_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
ON ai_feedback FOR SELECT
USING (auth.uid() = user_id);

-- Add to our realtime publication if needed
-- ALTER PUBLICATION supabase_realtime ADD TABLE ai_feedback;
