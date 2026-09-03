import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';
import { isFirebaseConfigured } from '../../lib/firebase.js';
import './License.css';

export default function LicenseModal({ reason, onClose, onActivated }) {
  const user = useAuthStore((s) => s.user);
  const signIn = useAuthStore((s) => s.signInWithGoogle);
  const [key, setKey] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const handleActivate = async () => {
    setStatus('loading'); setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/claim-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key: key.trim() }),
      });
      const data = res.ok ? await res.json() : {};
      if (data.plan && data.plan !== 'free') {
        useAuthStore.setState({ plan: data.plan });
        onActivated();
        return;
      }
      setStatus('error');
      setError('Chave inválida. Confira e tente de novo.');
    } catch {
      setStatus('error');
      setError('Não foi possível validar agora. Tente de novo em instantes.');
    }
  };

  return (
    <div className="license-backdrop" onClick={onClose}>
      <div className="license-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="license-close" onClick={onClose}>✕</button>
        <h2>Assine o VSM Builder Pro</h2>
        <p>{reason || 'Salve seus mapas na nuvem e abra de qualquer dispositivo.'}</p>

        {isFirebaseConfigured() && (
          <div className="license-plans">
            <div className="license-plan">
              <span className="license-plan-price">R$27<small>/mês</small></span>
              <span className="license-plan-label">Mensal</span>
            </div>
            <div className="license-plan">
              <span className="license-plan-price">R$270<small>/ano</small></span>
              <span className="license-plan-label">Anual · 2 meses grátis</span>
            </div>
          </div>
        )}
        {isFirebaseConfigured() && (
          <div className="license-buy-links">
            <a className="license-activate-btn license-buy-whatsapp"
              href="https://wa.me/5527997836020?text=Quero%20assinar%20o%20VSM%20Builder%20Pro"
              target="_blank" rel="noopener noreferrer">
              Assinar pelo WhatsApp
            </a>
            <a className="license-buy-email"
              href="mailto:sergiobetinim@gmail.com?subject=Quero%20assinar%20o%20VSM%20Builder%20Pro">
              ou por e-mail: sergiobetinim@gmail.com
            </a>
          </div>
        )}

        {!isFirebaseConfigured() ? (
          <p className="license-reason">
            O salvamento na nuvem chega em breve. Por enquanto, use <strong>Exportar PDF</strong> ou <strong>Exportar JSON</strong> para guardar seu trabalho.
          </p>
        ) : !user ? (
          <>
            <p className="license-reason">Entre primeiro para ativar sua licença ou assinatura.</p>
            <button type="button" className="license-activate-btn" onClick={signIn}>Entrar com Google</button>
          </>
        ) : (
          <>
            <label className="license-label">
              Já tem uma chave?
              <input className="license-input" value={key}
                onChange={(e) => setKey(e.target.value)} placeholder="VSM-XXXX-XXXX" />
            </label>
            {status === 'error' && <p className="license-error">{error}</p>}
            <button type="button" className="license-activate-btn"
              onClick={handleActivate} disabled={status === 'loading' || !key.trim()}>
              {status === 'loading' ? 'Validando…' : 'Ativar'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
