import * as fs from 'fs';
import * as path from 'path';

// Read and parse the CSV file
const csvPath = path.join(__dirname, '../imports/Push_Factors-_Difficulties_Faced_in_EU_Countries_.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Split into lines
const lines = csvContent.split('\n');
const headers = lines[0].split(',');

// Find the column indices for the difficulty questions
// These columns start with "When you were living in European countries, what were the main difficulties or challenges you faced?/"
const difficultyColumns: { [key: string]: number } = {};

headers.forEach((header, index) => {
  if (header.includes('When you were living in European countries, what were the main difficulties or challenges you faced?/')) {
    const category = header.split('?/')[1]?.replace(/"/g, '').trim();
    if (category && category !== 'Other' && category !== 'Prefer not to say' && category !== 'I do not know' && category !== 'Personal circumstances/issues') {
      difficultyColumns[category] = index;
    }
  }
});

console.log('Difficulty columns found:', difficultyColumns);
console.log('Total columns:', Object.keys(difficultyColumns).length);

// Count occurrences for each difficulty
const counts: { [key: string]: number } = {};
Object.keys(difficultyColumns).forEach(cat => counts[cat] = 0);

// Process each data row
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  
  const values = line.split(',');
  
  Object.entries(difficultyColumns).forEach(([category, colIndex]) => {
    if (values[colIndex] === '1') {
      counts[category]++;
    }
  });
}

console.log('\nCounts by difficulty:');
Object.entries(counts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([category, count]) => {
    console.log(`${category}: ${count}`);
  });

const totalRespondents = lines.length - 1; // Minus header
console.log('\nTotal respondents:', totalRespondents);
