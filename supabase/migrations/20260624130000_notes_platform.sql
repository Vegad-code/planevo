-- Planevo Notes Platform: organization, blocks, study features, FTS

-- 1. Notebooks
CREATE TABLE IF NOT EXISTS public.notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'personal' CHECK (kind IN ('inbox', 'personal', 'course', 'project')),
  icon TEXT,
  color TEXT,
  canvas_course_name TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notebooks_user_id_sort_idx ON public.notebooks (user_id, sort_order);

ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notebooks" ON public.notebooks;
CREATE POLICY "Users can view own notebooks" ON public.notebooks FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own notebooks" ON public.notebooks;
CREATE POLICY "Users can create own notebooks" ON public.notebooks FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notebooks" ON public.notebooks;
CREATE POLICY "Users can update own notebooks" ON public.notebooks FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own notebooks" ON public.notebooks;
CREATE POLICY "Users can delete own notebooks" ON public.notebooks FOR DELETE USING (auth.uid() = user_id);

-- 2. Tags
CREATE TABLE IF NOT EXISTS public.note_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own note_tags" ON public.note_tags;
CREATE POLICY "Users can view own note_tags" ON public.note_tags FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own note_tags" ON public.note_tags;
CREATE POLICY "Users can create own note_tags" ON public.note_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own note_tags" ON public.note_tags;
CREATE POLICY "Users can update own note_tags" ON public.note_tags FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own note_tags" ON public.note_tags;
CREATE POLICY "Users can delete own note_tags" ON public.note_tags FOR DELETE USING (auth.uid() = user_id);

-- 3. Enhance notes table
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS notebook_id UUID REFERENCES public.notebooks(id) ON DELETE SET NULL;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS content_json JSONB;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS content_markdown TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS note_kind TEXT NOT NULL DEFAULT 'quick_capture'
  CHECK (note_kind IN ('quick_capture', 'class_note', 'study_guide', 'daily', 'template_instance', 'bruno_generated'));
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS privacy TEXT NOT NULL DEFAULT 'private'
  CHECK (privacy IN ('private', 'class', 'shared'));
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS canvas_course_name TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS linked_assignment_id TEXT REFERENCES public.canvas_assignments(id) ON DELETE SET NULL;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS linked_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_daily BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS daily_date DATE;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Backfill content_markdown from legacy content column
UPDATE public.notes SET content_markdown = content WHERE content_markdown IS NULL AND content IS NOT NULL;

CREATE INDEX IF NOT EXISTS notes_notebook_id_idx ON public.notes (notebook_id);
CREATE INDEX IF NOT EXISTS notes_user_daily_date_idx ON public.notes (user_id, daily_date) WHERE is_daily = true;
CREATE INDEX IF NOT EXISTS notes_search_vector_idx ON public.notes USING gin (search_vector);

-- 4. Tag assignments
CREATE TABLE IF NOT EXISTS public.note_tag_assignments (
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.note_tags(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

ALTER TABLE public.note_tag_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own note_tag_assignments" ON public.note_tag_assignments;
CREATE POLICY "Users can view own note_tag_assignments" ON public.note_tag_assignments FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own note_tag_assignments" ON public.note_tag_assignments;
CREATE POLICY "Users can create own note_tag_assignments" ON public.note_tag_assignments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own note_tag_assignments" ON public.note_tag_assignments;
CREATE POLICY "Users can delete own note_tag_assignments" ON public.note_tag_assignments FOR DELETE USING (auth.uid() = user_id);

-- 5. Note links (backlinks)
CREATE TABLE IF NOT EXISTS public.note_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  target_note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  source_block_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_note_id, target_note_id, source_block_id)
);

ALTER TABLE public.note_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own note_links" ON public.note_links;
CREATE POLICY "Users can view own note_links" ON public.note_links FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own note_links" ON public.note_links;
CREATE POLICY "Users can create own note_links" ON public.note_links FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own note_links" ON public.note_links;
CREATE POLICY "Users can delete own note_links" ON public.note_links FOR DELETE USING (auth.uid() = user_id);

-- 6. Block refs index
CREATE TABLE IF NOT EXISTS public.note_block_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL,
  block_type TEXT NOT NULL,
  text_preview TEXT,
  UNIQUE (note_id, block_id)
);

ALTER TABLE public.note_block_refs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own note_block_refs" ON public.note_block_refs;
CREATE POLICY "Users can view own note_block_refs" ON public.note_block_refs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own note_block_refs" ON public.note_block_refs;
CREATE POLICY "Users can manage own note_block_refs" ON public.note_block_refs FOR ALL USING (auth.uid() = user_id);

-- 7. Revisions
CREATE TABLE IF NOT EXISTS public.note_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_json JSONB,
  content_markdown TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS note_revisions_note_id_created_idx ON public.note_revisions (note_id, created_at DESC);

ALTER TABLE public.note_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own note_revisions" ON public.note_revisions;
CREATE POLICY "Users can view own note_revisions" ON public.note_revisions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own note_revisions" ON public.note_revisions;
CREATE POLICY "Users can create own note_revisions" ON public.note_revisions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. Templates
CREATE TABLE IF NOT EXISTS public.note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  note_kind TEXT NOT NULL DEFAULT 'class_note',
  content_json JSONB NOT NULL DEFAULT '[]',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS note_templates_system_slug_idx ON public.note_templates (slug) WHERE is_system = true;
CREATE UNIQUE INDEX IF NOT EXISTS note_templates_user_slug_idx ON public.note_templates (user_id, slug) WHERE is_system = false;

ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view note_templates" ON public.note_templates;
CREATE POLICY "Users can view note_templates" ON public.note_templates FOR SELECT
  USING (is_system = true OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own note_templates" ON public.note_templates;
CREATE POLICY "Users can create own note_templates" ON public.note_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = false);
DROP POLICY IF EXISTS "Users can update own note_templates" ON public.note_templates;
CREATE POLICY "Users can update own note_templates" ON public.note_templates FOR UPDATE
  USING (auth.uid() = user_id AND is_system = false);
DROP POLICY IF EXISTS "Users can delete own note_templates" ON public.note_templates;
CREATE POLICY "Users can delete own note_templates" ON public.note_templates FOR DELETE
  USING (auth.uid() = user_id AND is_system = false);

-- 9. Flashcards
CREATE TABLE IF NOT EXISTS public.note_flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  block_id TEXT,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  interval_days INT NOT NULL DEFAULT 0,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS note_flashcards_user_review_idx ON public.note_flashcards (user_id, next_review_at);

ALTER TABLE public.note_flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own note_flashcards" ON public.note_flashcards;
CREATE POLICY "Users can view own note_flashcards" ON public.note_flashcards FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own note_flashcards" ON public.note_flashcards;
CREATE POLICY "Users can create own note_flashcards" ON public.note_flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own note_flashcards" ON public.note_flashcards;
CREATE POLICY "Users can update own note_flashcards" ON public.note_flashcards FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own note_flashcards" ON public.note_flashcards;
CREATE POLICY "Users can delete own note_flashcards" ON public.note_flashcards FOR DELETE USING (auth.uid() = user_id);

-- 10. FTS trigger
CREATE OR REPLACE FUNCTION public.notes_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content_markdown, NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notes_search_vector_trigger ON public.notes;
CREATE TRIGGER notes_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, content_markdown, content ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.notes_search_vector_update();

-- Backfill search vectors
UPDATE public.notes SET search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(content_markdown, content, '')), 'B')
WHERE search_vector IS NULL;

-- Daily note uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS notes_user_daily_date_unique_idx
  ON public.notes (user_id, daily_date) WHERE is_daily = true AND daily_date IS NOT NULL;
