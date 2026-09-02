import { getAdmin, sha256Email } from './_firebaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const authz = req.headers.authorization || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'no_token' });

  const { auth, db } = getAdmin();

  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    return res.status(401).json({ error: 'bad_token' });
  }

  if (!decoded.email || decoded.email_verified === false) {
    return res.status(400).json({ error: 'no_email' });
  }

  const userRef = db.doc(`users/${decoded.uid}`);
  const now = new Date();

  // 1. Compra pendente por e-mail
  const hash = sha256Email(decoded.email);
  const pendingRef = db.doc(`pendingPlans/${hash}`);
  const pending = await pendingRef.get();
  if (pending.exists) {
    const p = pending.data();
    await userRef.update({ plan: p.plan, planSource: p.source, planUpdatedAt: now });
    await pendingRef.delete();
    return res.status(200).json({ plan: p.plan });
  }

  // 2. Chave manual (fallback legado)
  const key = (req.body && req.body.key ? String(req.body.key) : '').trim();
  if (key) {
    const valid = (process.env.VALID_LICENSES || '')
      .split(',').map((k) => k.trim()).filter(Boolean);
    if (valid.includes(key)) {
      await userRef.update({ plan: 'pro', planSource: 'manual', planUpdatedAt: now });
      return res.status(200).json({ plan: 'pro' });
    }
    return res.status(200).json({ plan: 'free', error: 'invalid_key' });
  }

  // 3. Nada a fazer
  const snap = await userRef.get();
  return res.status(200).json({ plan: (snap.exists && snap.data().plan) || 'free' });
}
