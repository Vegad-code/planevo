const fs = require('fs');
const p = 'apps/web/app/dashboard/daily-plan/page.tsx';
let content = fs.readFileSync(p, 'utf8');
content = content.replace('aria-checked={energyLevel === level ? "true" : "false"}', 'aria-checked={energyLevel === level}');
fs.writeFileSync(p, content, 'utf8');
console.log('Fixed aria-checked');
