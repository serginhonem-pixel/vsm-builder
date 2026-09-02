import { useVsmStore } from '../store/useVsmStore.js';
import { useAuthStore, isPaid } from '../store/useAuthStore.js';
import { serializeFlowState, hydrateFlowState } from './flowState.js';

const KEY = 'vsm-draft';
let started = false;

export function clearSessionDraft() {
  try { sessionStorage.removeItem(KEY); } catch { /* modo privado */ }
}

export function initSessionPersist() {
  if (started) return () => {};
  started = true;

  const paidNow = () => isPaid(useAuthStore.getState());

  // hidratação inicial (só free)
  if (!paidNow()) {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) useVsmStore.setState(hydrateFlowState(JSON.parse(raw)));
    } catch { /* ignora */ }
  }

  let t = null;
  const unsub = useVsmStore.subscribe((s) => {
    if (paidNow()) return;
    clearTimeout(t);
    t = setTimeout(() => {
      try {
        sessionStorage.setItem(KEY, JSON.stringify(serializeFlowState(s)));
      } catch { /* quota / modo privado */ }
    }, 800);
  });

  return () => { started = false; clearTimeout(t); unsub(); };
}
