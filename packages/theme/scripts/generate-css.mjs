import { COLOR_THEMES, tokensToCssBlock } from './src/color-themes.ts';

const lines: string[] = [
  '/* ============================================================',
  '   APP COLOR THEMES  (applied via data-color-theme on <html>)',
  '   Keep in sync with packages/theme — classic uses @theme defaults.',
  '   ============================================================ */',
  '',
];

for (const t of COLOR_THEMES) {
  if (t.id === 'classic') continue;
  lines.push(`html[data-color-theme="${t.id}"] {`);
  lines.push(tokensToCssBlock(t.light));
  lines.push('}');
  lines.push('');
  lines.push(`html.dark[data-color-theme="${t.id}"] {`);
  lines.push(tokensToCssBlock(t.dark));
  lines.push('}');
  lines.push('');
}

process.stdout.write(lines.join('\n'));
