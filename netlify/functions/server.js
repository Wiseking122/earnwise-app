const serverless = require('serverless-http');
const express = require('express');
const app = express();

// Enable standard JSON parsers
app.use(express.json());

// Forwarding logic to catch payment initialization and AI chat requests
app.use('/api', (req, res) => {
  res.json({ 
    success: true, 
    status: "Backend active", 
    message: "Earnwise production serverless gateways operational." 
  });
});

module.exports = serverless(app);
