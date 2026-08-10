// Vercel Serverless Function.
// V1: valid keys live in the VALID_LICENSES env var (comma-separated),
// managed manually in the Vercel dashboard after each CartPanda sale.
// V2 (later): swap this for a CartPanda webhook + Vercel Edge Config,
// so keys get added automatically instead of by hand.
export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ valid: false, error: 'method_not_allowed' });
    return;
  }

  const { key } = req.body || {};
  const validKeys = (process.env.VALID_LICENSES || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  const valid = !!key && validKeys.includes(key.trim());
  res.status(200).json({ valid });
}
