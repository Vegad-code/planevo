/**
 * Backfill legacy markdown notes to BlockNote JSON.
 * Run: npx tsx apps/web/scripts/backfill-notes-json.ts
 */
import { createClient } from '@supabase/supabase-js';
import { markdownToPlainParagraphBlocks, blocksToMarkdown } from '@planevo/notes-core';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function main() {
  const { data: notes, error } = await supabase
    .from('notes')
    .select('id, content, content_json, content_markdown')
    .is('content_json', null);

  if (error) {
    console.error(error);
    process.exit(1);
  }

  let updated = 0;
  for (const note of notes ?? []) {
    const markdown = note.content_markdown ?? note.content ?? '';
    const blocks = markdownToPlainParagraphBlocks(markdown);
    const { error: updateError } = await supabase
      .from('notes')
      .update({
        content_json: blocks,
        content_markdown: blocksToMarkdown(blocks) || markdown,
      })
      .eq('id', note.id);

    if (!updateError) updated += 1;
  }

  console.log(`Backfilled ${updated} notes`);
}

void main();
