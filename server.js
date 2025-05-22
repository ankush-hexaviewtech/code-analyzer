const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Helper: Run Salesforce Code Analyzer on a file
function runCodeAnalyzer(filePath) {
  try {
    const command = `sfdx scanner:run --target ${filePath} --format json --engine pmd,cpd`;
    const result = execSync(command, { encoding: 'utf-8' });
    return JSON.parse(result);
  } catch (error) {
    console.error('Scanner Error:', error.message);
    return { error: error.message };
  }
}

// POST /analyze
// Input: { "fileName": "MyClass.cls", "codeContent": "public class MyClass { ... }" }
app.post('/analyze', (req, res) => {
  const { fileName, codeContent } = req.body;

  if (!fileName || !codeContent) {
    return res.status(400).json({ error: 'fileName and codeContent are required' });
  }

  const tempFileName = `${uuidv4()}-${fileName}`;
  const tempFilePath = path.join('/tmp', tempFileName);

  try {
    fs.writeFileSync(tempFilePath, codeContent, 'utf-8');
    const analysisResults = runCodeAnalyzer(tempFilePath);
    fs.unlinkSync(tempFilePath); // Clean up temp file

    res.json({ success: true, results: analysisResults });
  } catch (err) {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Salesforce Code Analyzer Webhook is running.');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Webhook listening on port ${PORT}`);
});
