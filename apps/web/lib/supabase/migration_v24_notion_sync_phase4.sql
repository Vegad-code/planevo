-- Add import_page_content to integration_source_mappings
ALTER TABLE integration_source_mappings
ADD COLUMN IF NOT EXISTS import_page_content boolean DEFAULT false;
