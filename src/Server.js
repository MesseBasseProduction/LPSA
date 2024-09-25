const express = require('express');
const path = require('path');
const compression = require('compression');
const zlib = require('node:zlib');
// App and preferences
const version = '0.0.1';
const port = 8060;
const app = express();
// Log server start
console.log(`${(new Date()).toISOString()} | LPSA v${version} | Starting web server`);

// Ensure responses are compressed through this midleware
app.use(compression({
  level: zlib.constants.Z_BEST_COMPRESSION,
}));

// URL definitions
app.use('/assets', express.static(path.join(__dirname, '../assets'), { // Serve static files
  maxAge: '864000000' // 10 days caching for app assets
}));

// Page urls
app.get('/',  (req, res) => {
console.log(`${(new Date()).toISOString()} | LPSA v${version} | 200 ${req.originalUrl} page requested, return index.html`);
res.sendFile(path.join(__dirname, '../index.html'));
});
// Send / for all urls, avoid 404
app.use((req, res) => {
  console.log(`${(new Date()).toISOString()} | LPSA v${version} | 404 ${req.originalUrl} page requested, return index.html`);
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Start server console
app.listen(port, () => {
  console.log(`${(new Date()).toISOString()} | LPSA v${version} | Server started and listening on port ${port}`);
});
