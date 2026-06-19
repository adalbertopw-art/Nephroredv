import fs from 'fs';
const file = 'services/geminiService.ts';
let content = fs.readFileSync(file, 'utf8');

// Fixing `getAIClient` instances
content = content.replace(
    /const ai = getAIClient\(([^)]+)\);[\s]+const prompt =/g,
    'try {\n    const ai = getAIClient($1);\n    const prompt ='
);
content = content.replace(
    /const ai = getAIClient\(([^)]+)\);[\s]+const response =/g,
    'try {\n    const ai = getAIClient($1);\n    const response ='
);

// We need to fix the fact that `try {` is already there further down
// e.g. 
// const ai = getAIClient(apiKey);
// const prompt = `Act as ...`;
// try {
// 
// So let's do a smarter replacement.
