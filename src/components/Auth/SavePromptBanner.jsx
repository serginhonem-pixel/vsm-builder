import { useState } from 'react';
import { useAuthStore, isPaid } from '../../store/useAuthStore.js';
import './Auth.css';

const HIDE_KEY = 'vsm-saveprompt-hidden';

export default function SavePromptBanner() {
  const state = useAuthStore();
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem(HIDE_KEY) === '1'; } catch { return false; }
  });

  if (isPaid(state) || hidden) return null;

  const dismiss = () => {
    try { sessionStorage.setItem(HIDE_KEY, '1'); } catch { /* ignora */ }
    setHidden(true);
  };

  return (
    <div className="save-prompt">
      <span>Seu trabalho não está sendo salvo. <strong>Entre para salvar seu trabalho na nuvem.</strong></span>
      <button type="button" className="save-prompt-cta" onClick={state.signInWithGoogle}>Entrar</button>
      <button type="button" className="save-prompt-x" onClick={dismiss} aria-label="Dispensar">✕</button>
    </div>
  );
}
