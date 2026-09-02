import { useState } from 'react';
import { useAuthStore, isPaid } from '../../store/useAuthStore.js';
import { saveFlow } from '../../lib/flowsRepo.js';
import './Auth.css';

const DONE_KEY = 'vsm-migration-done';
const LEGACY_KEYS = ['vsm-flows', 'vsm_builder_flows'];

export function readLegacyFlows() {
  const out = [];
  for (const key of LEGACY_KEYS) {
    let obj;
    try { obj = JSON.parse(localStorage.getItem(key) || '{}'); } catch { obj = {}; }
    for (const [name, state] of Object.entries(obj)) {
      out.push({ name, state, __key: key });
    }
  }
  return out;
}

export default function MigrationModal() {
  const state = useAuthStore();
  const [legacy] = useState(readLegacyFlows);
  const [done, setDone] = useState(() => {
    try { return sessionStorage.getItem(DONE_KEY) === '1'; } catch { return false; }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!isPaid(state) || done || legacy.length === 0) return null;

  const finish = () => {
    try { sessionStorage.setItem(DONE_KEY, '1'); } catch { /* ignora */ }
    setDone(true);
  };

  const migrate = async () => {
    setBusy(true); setError('');
    let allOk = true;
    for (const item of legacy) {
      try {
        await saveFlow(null, { name: item.name, storeState: item.state });
        item.__migrated = true;
      } catch {
        allOk = false;
        break;
      }
    }
    if (allOk) {
      for (const key of LEGACY_KEYS) {
        const v = localStorage.getItem(key);
        if (v) { localStorage.setItem(`${key}__migrated_backup`, v); localStorage.removeItem(key); }
      }
      finish();
    } else {
      setError('Não deu pra enviar todos agora. Tente de novo mais tarde — mapas já enviados podem aparecer duplicados e você pode apagá-los.');
      setBusy(false);
    }
  };

  return (
    <div className="license-backdrop">
      <div className="license-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Trazer seus mapas para a conta</h2>
        <p>Você tem <strong>{legacy.length}</strong> mapa(s) salvos neste navegador. Levar para a sua conta na nuvem?</p>
        <button type="button" className="license-activate-btn" onClick={migrate} disabled={busy}>
          {busy ? 'Enviando…' : `Trazer ${legacy.length} mapa(s)`}
        </button>
        <button type="button" className="license-close-text" onClick={finish} disabled={busy}>Agora não</button>
        {error && <p className="license-error">{error}</p>}
      </div>
    </div>
  );
}
