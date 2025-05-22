const express = require('express');
const fs = require('fs');
const { execSync } = require('child_process');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '2mb' }));

app.post('/analyze', async (req, res) => {
  const { fileName, codeContent } = req.body;

  if (!fileName || !codeContent) {
    return res.status(400).send('Missing fileName or codeContent');
  }

  const filePath = `/tmp/${fileName}`;

  try {
    // Write the code to a temporary file
    fs.writeFileSync(filePath, codeContent);

    // Run Salesforce Code Analyzer
    const output = execSync(`sfdx scanner:run --target ${filePath} --format json`, {
      encoding: 'utf-8'
    });

    const parsed = JSON.parse(output);
    let feedback = '✅ No issues found.';

    if (parsed.length > 0 && parsed[0].results.length > 0) {
      feedback = parsed.map(entry =>
        entry.results.map(issue =>
          `❌ [${issue.engine}] ${issue.ruleName} in ${issue.fileName} @ Line ${issue.line}: ${issue.message}`
        ).join('\n')
      ).join('\n');
    }

    res.status(200).send(feedback);
  } catch (error) {
    console.error('Error running scanner:', error.message);
    res.status(500).send(`❌ Scanner error: ${error.message}`);
  } finally {
    // Cleanup
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

app.get('/', (_, res) => {
  res.send('Salesforce Code Analyzer Webhook is running');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
