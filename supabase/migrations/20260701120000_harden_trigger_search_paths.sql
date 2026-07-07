-- Pin search_path on trigger functions invoked during service_role writes.

CREATE OR REPLACE FUNCTION public.notes_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector :=
    pg_catalog.setweight(pg_catalog.to_tsvector('english', pg_catalog.coalesce(NEW.title, '')), 'A') ||
    pg_catalog.setweight(
      pg_catalog.to_tsvector(
        'english',
        pg_catalog.coalesce(NEW.content_markdown, NEW.content, '')
      ),
      'B'
    );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_calendar_events_soft_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.is_deleted IS DISTINCT FROM OLD.is_deleted THEN
      IF NEW.is_deleted = true AND NEW.deleted_at IS NULL THEN
        NEW.deleted_at := pg_catalog.now();
      ELSIF NEW.is_deleted = false THEN
        NEW.deleted_at := NULL;
      END IF;
    ELSIF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
      IF NEW.deleted_at IS NOT NULL THEN
        NEW.is_deleted := true;
      ELSE
        NEW.is_deleted := false;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
