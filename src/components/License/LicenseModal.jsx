import { useState } from 'react';
import { activateLicense } from '../../utils/license.js';
import './License.css';

export default function LicenseModal({ reason, onClose, onActivated }) {
  const [key, setKey]     = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [error, setError]   = useState('');

  const handleActivate = async () => {
    setStatus('loading');
    setError('');
    const result = await activateLicense(key);
    if (result.valid) {
      onActivated();
      return;
    }
    setStatus('error');
    setError(
      result.error === 'network'
        ? 'Não foi possível validar agora. Tente de novo em instantes.'
        : 'Chave inválida. Confira e tente de novo.'
    );
  };

  return (
    <div className="license-backdrop" onClick={onClose}>
      <div className="license-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="license-close" onClick={onClose}>✕</button>

        <h2>Ative sua licença</h2>
        {reason && <p className="license-reason">{reason}</p>}

        <label className="license-label">
          Chave de licença
          <input
            className="license-input"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="VSM-XXXX-XXXX"
            autoFocus
          />
        </label>

        {status === 'error' && <p className="license-error">{error}</p>}

        <button
          type="button"
          className="license-activate-btn"
          onClick={handleActivate}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Validando…' : 'Ativar'}
        </button>

        <p className="license-buy-hint">Ainda não tem uma licença? Em breve, link de compra aqui.</p>
      </div>
    </div>
  );
}
