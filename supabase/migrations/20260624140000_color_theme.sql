-- Full-app color themes (replaces accent-only preference)
ALTER TABLE users ADD COLUMN IF NOT EXISTS color_theme text;

UPDATE users
SET color_theme = CASE accent_color
  WHEN 'honey' THEN 'classic'
  WHEN 'warm' THEN 'classic'
  WHEN 'terracotta' THEN 'earth-garden'
  WHEN 'amber' THEN 'ember'
  WHEN 'sage' THEN 'forest-olive'
  WHEN 'ocean' THEN 'coastal-blue'
  WHEN 'plum' THEN 'soft-coral'
  WHEN 'rosewood' THEN 'soft-coral'
  ELSE 'classic'
END
WHERE color_theme IS NULL;
