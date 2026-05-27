-- Migration v13: Bruno Tool Logs
-- Creates a table for persisting Bruno Chat tool calls for audit and debugging

CREATE TABLE public.bruno_tool_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    arguments JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.bruno_tool_logs ENABLE ROW LEVEL SECURITY;

-- Policies for bruno_tool_logs
CREATE POLICY "Users can insert their own tool logs"
    ON public.bruno_tool_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tool logs"
    ON public.bruno_tool_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Create an index on user_id and created_at for fast queries
CREATE INDEX idx_bruno_tool_logs_user_id ON public.bruno_tool_logs(user_id);
CREATE INDEX idx_bruno_tool_logs_created_at ON public.bruno_tool_logs(created_at DESC);
