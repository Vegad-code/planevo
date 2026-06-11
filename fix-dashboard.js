const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/web/app/dashboard/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replacements for Tailwind classes
const replacements = [
  // Specific arbitrary values
  { from: 'tracking-[0.1em]', to: 'tracking-widest' },
  { from: 'min-h-[280px]', to: 'min-h-70' },
  { from: 'sm:max-w-[420px]', to: 'sm:max-w-105' },
  { from: 'rounded-[24px]', to: 'rounded-3xl' },
];

content = replacements.reduce((acc, { from, to }) => acc.replace(new RegExp(from.replace(/\[/g, '\\[').replace(/\]/g, '\\]'), 'g'), to), content);

// Replace line, line-strong, bruno-deep, cream directly
const directColors = ['line', 'line-strong', 'bruno-deep', 'cream'];
directColors.forEach(color => {
  const regex = new RegExp(`\\[var\\(--color-${color}\\)\\]`, 'g');
  content = content.replace(regex, color);
});

// Replace other variables with (--color-X)
content = content.replace(/\[var\((--color-[a-z0-9-]+)\)\]/g, '($1)');

// Fix inline styles
content = content.replace(/style=\{\{ flex: 'none' \}\}/g, 'className="flex-none"');

// Fix buttons discernible text
content = content.replace(
  /<button onClick=\{\(\) => setSelectedTaskModal\(null\)\} className="p-1\.5/g,
  '<button onClick={() => setSelectedTaskModal(null)} aria-label="Close task modal" title="Close task modal" className="p-1.5'
);

fs.writeFileSync(filePath, content);
console.log('Fixed dashboard page.tsx');
