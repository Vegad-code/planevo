-- Planevo - Performance Indexes (v6)
-- Optimizes queries on canvas_assignments, chat_conversations, and bruno_messages.

CREATE INDEX IF NOT EXISTS idx_canvas_assignments_user_due 
  ON public.canvas_assignments (user_id, due_at);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_active 
  ON public.chat_conversations (user_id, last_active DESC);

CREATE INDEX IF NOT EXISTS idx_bruno_messages_conv_created 
  ON public.bruno_messages (conversation_id, created_at);
