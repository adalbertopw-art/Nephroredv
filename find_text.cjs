const fs = require('fs');
const content = fs.readFileSync('App.tsx', 'utf-8');
const rx = />\s*([^<]+)\s*</g;
let match;
let count = 0;
while ((match = rx.exec(content)) !== null) {
  const text = match[1].trim();
  if (text && text.length > 2 && /[a-záéíóú]/i.test(text)) {
    console.log(text);
    count++;
  }
}
