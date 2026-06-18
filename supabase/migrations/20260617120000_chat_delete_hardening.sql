-- Harden chat deletion: ensure RLS DELETE policy and message cascade on conversation delete.

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete own chat conversations" ON public.chat_conversations;
CREATE POLICY "Users can delete own chat conversations"
  ON public.chat_conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Re-apply FK with ON DELETE CASCADE if an older schema omitted it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'bruno_messages'
      AND constraint_name = 'bruno_messages_conversation_id_fkey'
  ) THEN
    ALTER TABLE public.bruno_messages
      DROP CONSTRAINT bruno_messages_conversation_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bruno_messages'
      AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE public.bruno_messages
      ADD CONSTRAINT bruno_messages_conversation_id_fkey
      FOREIGN KEY (conversation_id)
      REFERENCES public.chat_conversations(id)
      ON DELETE CASCADE;
  END IF;
END $$;
