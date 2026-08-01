const fs = require('fs');
let c = fs.readFileSync('src/components/Player.jsx', 'utf8');

// Normalize line endings
const lines = c.split(/\r?\n/);
const fixedLines = [];
for (let i = 0; i < lines.length; i++) {
  fixedLines.push(lines[i]);
  // After the last </group> (closing internal group), before </RigidBody>
  if (lines[i].trim() === '</group>' && i + 1 < lines.length && lines[i+1].trim() === '</RigidBody>') {
    // Add the parent group closing tag
    console.log(`Found pattern at line ${i}: ${JSON.stringify(lines[i])}, next: ${JSON.stringify(lines[i+1])}`);
    // Insert "      </group>" before the </RigidBody>
    // But we need to check the indentation of the current </group>
    fixedLines.splice(i+1, 0, '      </group>');
    break;
  }
}

if (fixedLines.length !== lines.length) {
  c = fixedLines.join('\n');
  fs.writeFileSync('src/components/Player.jsx', c);
  console.log('✅ Fixed missing </group>');
} else {
  console.log('❌ Pattern not found. Looking at last 10 lines:');
  for (let i = Math.max(0, lines.length-10); i < lines.length; i++) {
    console.log(`Line ${i}: ${JSON.stringify(lines[i])}`);
  }
}
