import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const legendaries = JSON.parse(
  readFileSync(join(__dirname, 'data', 'legendaries.json'), 'utf-8')
);

app.get('/api/legendaries', (req, res) => {
  const { generation, type, search } = req.query;
  let result = legendaries;

  if (generation) {
    const gens = generation.split(',').map(Number);
    result = result.filter(p => gens.includes(p.generation));
  }
  if (type) {
    result = result.filter(p => p.types.includes(type));
  }
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(p => p.name.toLowerCase().includes(q));
  }

  res.json(result);
});

app.get('/api/legendaries/:id', (req, res) => {
  const pokemon = legendaries.find(p => p.id === parseInt(req.params.id));
  if (!pokemon) return res.status(404).json({ error: 'Pokemon not found' });
  res.json(pokemon);
});

app.get('/api/generations', (req, res) => {
  const gens = [...new Set(legendaries.map(p => p.generation))].sort();
  res.json(gens);
});

app.get('/api/types', (req, res) => {
  const types = [...new Set(legendaries.flatMap(p => p.types))].sort();
  res.json(types);
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
