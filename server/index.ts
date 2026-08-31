import express from 'express';

import { DeviceCatalog } from './device-catalog.js';

const PORT = 3001;

const app = express();
const catalog = DeviceCatalog.loadFromFile();

app.get('/api/devices/status', (_req, res) => {
  res.json(catalog.statusMap());
});

app.get('/api/devices', (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q : '';

  if (!query.trim()) {
    res.status(400).json({ error: 'Query parameter q is required' });
    return;
  }

  res.json(catalog.search(query));
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Devices API listening on http://localhost:${PORT}`);
});
