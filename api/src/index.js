import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import Redis from 'ioredis';
import fetch from 'node-fetch';

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = process.env.NFT_FACTORY_PROGRAM_ID || process.env.ZENBEASTS_PROGRAM_ID || process.env.NEXT_PUBLIC_PROGRAM_ID || '';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || process.env.NEXT_PUBLIC_HELIUS_API_KEY || '';
const REDIS_URL = process.env.REDIS_URL || '';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('tiny'));

let redis = null;
if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL);
    redis.on('error', () => {});
  } catch {}
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', rpc: SOLANA_RPC_URL, programId: PROGRAM_ID || null });
});

app.get('/beast/:mint', async (req, res) => {
  const { mint } = req.params;
  const cacheKey = `beast:${mint}`;
  try {
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    }

    if (!HELIUS_API_KEY) {
      return res.status(501).json({ error: 'Indexing not configured' });
    }

    const url = `https://helius-api.com/api/v0/assets?api-key=${HELIUS_API_KEY}`;
    const body = { limit: 1, page: 1, mintAddresses: [mint] };
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json();
    const asset = Array.isArray(data?.result) ? data.result[0] : null;
    const response = { mint, metadata: asset?.content?.metadata || null, raw: asset || null };

    if (redis) await redis.set(cacheKey, JSON.stringify(response), 'EX', 60);
    res.json(response);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch beast', details: e?.message || 'unknown' });
  }
});

app.get('/metrics', async (req, res) => {
  res.type('text/plain');
  res.send('# HELP zenbeasts_up 1 if API is up\n# TYPE zenbeasts_up gauge\nzenbeasts_up 1\n');
});

app.listen(PORT, HOST, () => {
  console.log(`ZenBeasts API listening on http://${HOST}:${PORT}`);
});