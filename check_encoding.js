const fs = require('fs');
const path = require('path');

function checkEncoding(dir) {
  const files = fs.readdirSync(dir);
  let foundErrors = false;

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(file)) continue;
      if (checkEncoding(fullPath)) foundErrors = true;
    } else if (file.match(/\.(tsx|ts|md|sql|css|json)$/)) {
      try {
        const content = fs.readFileSync(fullPath);
        content.toString('utf8');
        
        // Also check for the specific mojibake patterns
        const text = content.toString('binary');
        if (text.includes('ðŸ') || text.includes('â€“') || text.includes('â€”') || text.includes('â€™')) {
          console.log(`MOJIBAKE DETECTED in ${fullPath}`);
          foundErrors = true;
        }
      } catch (e) {
        console.log(`ENCODING ERROR in ${fullPath}: ${e.message}`);
        foundErrors = true;
      }
    }
  }
  return foundErrors;
}

if (!checkEncoding('.')) {
  console.log("No encoding issues or common mojibake patterns found.");
}
