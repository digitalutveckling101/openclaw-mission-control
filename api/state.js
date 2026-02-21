const { Pool } = require('pg');

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function ensureTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS mission_state (
      id INTEGER PRIMARY KEY,
      state JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await pool.query(sql);
}

module.exports = async (req, res) => {
  if (!connectionString) {
    return res.status(500).json({ error: 'Missing POSTGRES_URL / DATABASE_URL' });
  }

  const syncSecret = process.env.SYNC_SECRET || '';

  try {
    await ensureTable();

    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT state, updated_at FROM mission_state WHERE id = 1');
      if (!rows.length) return res.status(200).json({ state: null, updated_at: null });
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'POST') {
      if (syncSecret) {
        const provided = req.headers['x-sync-secret'];
        if (!provided || provided !== syncSecret) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
      }

      const incoming = req.body?.state;
      if (!incoming || typeof incoming !== 'object') {
        return res.status(400).json({ error: 'Body must include { state: {...} }' });
      }
      const { rows } = await pool.query(
        `INSERT INTO mission_state (id, state, updated_at)
         VALUES (1, $1::jsonb, NOW())
         ON CONFLICT (id)
         DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()
         RETURNING updated_at`,
        [JSON.stringify(incoming)]
      );
      return res.status(200).json({ ok: true, updated_at: rows[0].updated_at });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};