-- Rename the ollie_messages table to bruno_messages
ALTER TABLE public.ollie_messages RENAME TO bruno_messages;

-- Rename constraints and indexes on bruno_messages
ALTER INDEX IF EXISTS ollie_messages_pkey RENAME TO bruno_messages_pkey;
ALTER TABLE public.bruno_messages RENAME CONSTRAINT ollie_messages_user_id_fkey TO bruno_messages_user_id_fkey;
ALTER TABLE public.bruno_messages RENAME CONSTRAINT ollie_messages_conversation_id_fkey TO bruno_messages_conversation_id_fkey;

-- Rename the column in calendar_events
ALTER TABLE public.calendar_events RENAME COLUMN ollie_notes TO bruno_notes;

-- Update the RLS policy names if needed, though they don't break simply by being named "ollie", 
-- but for completeness we can recreate them or leave them as is since the table name changed.
-- Since the table renamed, policies automatically apply to the new table name.

-- Update any triggers, constraints, or functions that reference the table directly if applicable.
