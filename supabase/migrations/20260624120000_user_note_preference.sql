ALTER TABLE public.user_ai_memory
  ADD COLUMN IF NOT EXISTS note_preference JSONB NOT NULL DEFAULT '{
    "format": "bullets",
    "density": "standard",
    "include_mnemonics": true,
    "include_practice_questions": false,
    "handwriting_friendly": true,
    "subject_overrides": {}
  }'::jsonb;
