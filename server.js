const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { ensureBaseDirs } = require('./helpers/utils');
const { registerRoutes } = require('./helpers/routes');
const { PORT } = require('./helpers/config');

const app = express();

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));

ensureBaseDirs();
registerRoutes(app);

app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Leumas Repo RAG running on http://localhost:${PORT}`);
});
