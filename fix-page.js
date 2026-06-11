const fs = require('fs');

let lines = fs.readFileSync('apps/web/app/page.tsx', 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('key={adjectives[adjIndex]}}}}}')) {
    lines[i] = lines[i].replace('key={adjectives[adjIndex]}}}}}', 'key={adjectives[adjIndex]}');
  }
  if (lines[i].trim() === '{}') {
    lines[i] = '';
  }
  if (lines[i].includes('}`} }}')) {
    lines[i] = lines[i].replace('}`} }}', '}`}">');
  }
  if (lines[i].includes('<div }}')) {
    lines[i] = lines[i].replace('<div }}', '<div');
  }
}

fs.writeFileSync('apps/web/app/page.tsx', lines.join('\n'));
console.log('Fixed syntax errors');
