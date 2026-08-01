const fs = require('fs');
const path = require('path');

let c = fs.readFileSync(path.join(__dirname, 'src/components/mounts/Mount.jsx'), 'utf8');
let lines = c.split('\n');

// Find the truncated line (259) and fix it
for (let i = 0; i < lines.length; i++) {
  // Line 259: "        <Box args={[MS * 0.1, MS * 0.4, MS * 0.1"  (no closing bracket)
  if (lines[i].includes('args={[MS * 0.1, MS * 0.4, MS * 0.1') && !lines[i].includes(']}')) {
    // Remove this line and the next blank line, then the duplicate leg line
    // Remove lines i through i+1 (truncated line + blank)
    lines.splice(i, 2);
    break;
  }
}

c = lines.join('\n');
fs.writeFileSync(path.join(__dirname, 'src/components/mounts/Mount.jsx'), c, 'utf8');
console.log('Truncation fixed');
