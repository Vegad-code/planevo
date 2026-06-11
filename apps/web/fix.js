const fs = require('fs');
let content = fs.readFileSync('app/page.tsx', 'utf8');

function findMatchingClosingDiv(str, startIndex) {
  let depth = 1;
  let pos = startIndex;
  while (pos < str.length) {
    // match <div optionally with spaces or > to avoid matching <divider etc, but there aren't any here.
    // wait, we should be careful about <div inside comments or strings, but page.tsx shouldn't have raw HTML strings.
    const nextOpen = str.indexOf('<div', pos);
    const nextClose = str.indexOf('</div>', pos);

    if (nextClose === -1) return -1;

    // Is there a nextOpen before nextClose?
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 4;
    } else {
      depth--;
      if (depth === 0) {
        return nextClose;
      }
      pos = nextClose + 6;
    }
  }
  return -1;
}

let idx = 0;
while ((idx = content.indexOf('<div', idx)) !== -1) {
  const endOfOpeningTag = content.indexOf('>', idx);
  if (endOfOpeningTag === -1) break;
  
  const openingTagStr = content.slice(idx, endOfOpeningTag);
  const needsMotion = 
    openingTagStr.includes('variants=') || 
    openingTagStr.includes('initial=') || 
    openingTagStr.includes('whileInView') || 
    openingTagStr.includes('whileHover') || 
    openingTagStr.includes('{...fadeInUp}') || 
    openingTagStr.includes('animate=');

  if (needsMotion) {
    const closeIdx = findMatchingClosingDiv(content, idx + 4);
    if (closeIdx !== -1) {
      content = content.slice(0, closeIdx) + '</motion.div>' + content.slice(closeIdx + 6);
    }
    content = content.slice(0, idx) + '<motion.div' + content.slice(idx + 4);
    // don't advance idx much, because we replaced `<div` with `<motion.div`
    // just continue from idx + 11
    idx += 11;
  } else {
    idx += 4;
  }
}

fs.writeFileSync('app/page.tsx', content);
console.log('Fixed div tags with motion props');
