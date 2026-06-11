const fs = require('fs');
let c = fs.readFileSync('apps/web/app/page.tsx', 'utf8');

c = c.replace(/(bg|text|border|ring|shadow|decoration|selection:bg|hover:bg|hover:text|hover:shadow)-\[var\((--color-[^\)]+)\)\]/g, '$1-($2)');

c = c.replace(/w-\[500px\]/g, 'w-125');
c = c.replace(/h-\[500px\]/g, 'h-125');
c = c.replace(/min-w-\[200px\]/g, 'min-w-50');
c = c.replace(/md:min-w-\[280px\]/g, 'md:min-w-70');
c = c.replace(/w-\[180px\]/g, 'w-45');
c = c.replace(/h-\[200px\]/g, 'h-50');
c = c.replace(/w-\[120px\]/g, 'w-30');
c = c.replace(/md:-right-\[30px\]/g, 'md:-right-7.5');
c = c.replace(/md:w-\[240px\]/g, 'md:w-60');
c = c.replace(/rounded-\[16px\]/g, 'rounded-2xl');
c = c.replace(/rounded-\[32px\]/g, 'rounded-4xl');

c = c.replace(/style=\{\{ verticalAlign: 'bottom' \}\}/g, 'className="align-bottom"');

fs.writeFileSync('apps/web/app/page.tsx', c);
console.log('Fixed page.tsx');
