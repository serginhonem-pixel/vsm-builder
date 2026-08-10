const STORAGE_KEY = 'vsm-license-key';

export function isLicensed() {
  return !!localStorage.getItem(STORAGE_KEY);
}

export function getStoredLicenseKey() {
  return localStorage.getItem(STORAGE_KEY) || '';
}

export async function activateLicense(key) {
  const trimmed = (key || '').trim();
  if (!trimmed) return { valid: false, error: 'empty' };

  try {
    const res = await fetch('/api/validate-license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: trimmed }),
    });
    if (!res.ok) return { valid: false, error: 'network' };
    const data = await res.json();
    if (data.valid) {
      localStorage.setItem(STORAGE_KEY, trimmed);
      return { valid: true };
    }
    return { valid: false, error: 'invalid' };
  } catch {
    return { valid: false, error: 'network' };
  }
}
