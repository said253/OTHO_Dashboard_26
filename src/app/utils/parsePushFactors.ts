export async function parsePushFactorsData() {
  try {
    const response = await fetch('/src/imports/Push_Factors-_Difficulties_Faced_in_EU_Countries_.csv');
    const csvText = await response.text();
    
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    // Find column indices - Column BP is the 68th column (BP in Excel = 68)
    // But we need to find the actual difficulty columns based on the header names
    const difficultyColumnMap: { [key: string]: number } = {};
    
    headers.forEach((header, index) => {
      const match = header.match(/When you were living in European countries, what were the main difficulties or challenges you faced\?\/(.+)/);
      if (match) {
        const category = match[1].replace(/"/g, '').trim();
        difficultyColumnMap[category] = index;
      }
    });
    
    // Count occurrences
    const counts: { [key: string]: number } = {};
    
    // Initialize counts
    Object.keys(difficultyColumnMap).forEach(cat => {
      counts[cat] = 0;
    });
    
    // Process data rows (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Simple CSV parsing (this may need adjustment for complex CSVs with quotes)
      const values = line.split(',');
      
      Object.entries(difficultyColumnMap).forEach(([category, colIndex]) => {
        const value = values[colIndex]?.trim();
        if (value === '1') {
          counts[category]++;
        }
      });
    }
    
    return counts;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return null;
  }
}
