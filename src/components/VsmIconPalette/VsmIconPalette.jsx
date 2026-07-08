import { useVsmStore } from '../../store/useVsmStore.js';
import './VsmIconPalette.css';

const PALETTE_ITEMS = [
  { type: 'kaizen',       label: 'Kaizen',       color: '#ff6600' },
  { type: 'operador',     label: 'Operador',      color: '#333' },
  { type: 'fifo',         label: 'FIFO',          color: '#2563eb' },
  { type: 'supermercado', label: 'Supermercado',  color: '#333' },
  { type: 'kanban',       label: 'Kanban',        color: '#d97706' },
  { type: 'qualidade',    label: 'Qualidade',     color: '#e33' },
  { type: 'heijunka',     label: 'Heijunka',      color: '#7c3aed' },
];

const MINI_ICONS = {
  kaizen: (
    <svg width="22" height="22" viewBox="0 0 52 52">
      <polygon points="26,2 30,18 44,10 36,23 52,24 38,32 46,46 30,38 28,52 20,38 6,48 12,33 0,26 16,22 10,8 24,18"
        fill="#ff6600" stroke="#cc4400" strokeWidth="2"/>
    </svg>
  ),
  operador: (
    <svg width="18" height="22" viewBox="0 0 48 52">
      <circle cx="24" cy="8" r="7" fill="none" stroke="#333" strokeWidth="3"/>
      <line x1="24" y1="15" x2="24" y2="35" stroke="#333" strokeWidth="3"/>
      <line x1="24" y1="22" x2="10" y2="30" stroke="#333" strokeWidth="3"/>
      <line x1="24" y1="22" x2="38" y2="30" stroke="#333" strokeWidth="3"/>
      <line x1="24" y1="35" x2="14" y2="50" stroke="#333" strokeWidth="3"/>
      <line x1="24" y1="35" x2="34" y2="50" stroke="#333" strokeWidth="3"/>
    </svg>
  ),
  fifo: (
    <svg width="28" height="16" viewBox="0 0 56 34">
      <rect x="1" y="1" width="54" height="32" rx="4" fill="#e8f4ff" stroke="#2563eb" strokeWidth="3"/>
      <text x="28" y="22" textAnchor="middle" fontFamily="monospace" fontWeight="800" fontSize="14" fill="#2563eb">FIFO</text>
    </svg>
  ),
  supermercado: (
    <svg width="22" height="20" viewBox="0 0 52 48">
      <rect x="2" y="2" width="48" height="44" rx="2" fill="#fff" stroke="#333" strokeWidth="3"/>
      <line x1="2" y1="18" x2="50" y2="18" stroke="#333" strokeWidth="2"/>
      <line x1="2" y1="34" x2="50" y2="34" stroke="#333" strokeWidth="2"/>
      <line x1="18" y1="2" x2="18" y2="46" stroke="#333" strokeWidth="2"/>
      <line x1="34" y1="2" x2="34" y2="46" stroke="#333" strokeWidth="2"/>
    </svg>
  ),
  kanban: (
    <svg width="20" height="22" viewBox="0 0 44 52">
      <rect x="2" y="2" width="40" height="30" rx="3" fill="#fef3c7" stroke="#d97706" strokeWidth="3"/>
      <line x1="8" y1="13" x2="36" y2="13" stroke="#d97706" strokeWidth="2"/>
      <line x1="8" y1="22" x2="26" y2="22" stroke="#d97706" strokeWidth="2"/>
      <polygon points="22,34 14,48 30,48" fill="#fef3c7" stroke="#d97706" strokeWidth="2"/>
    </svg>
  ),
  qualidade: (
    <svg width="22" height="22" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="21" fill="#fff0f0" stroke="#e33" strokeWidth="3"/>
      <line x1="14" y1="14" x2="34" y2="34" stroke="#e33" strokeWidth="4" strokeLinecap="round"/>
      <line x1="34" y1="14" x2="14" y2="34" stroke="#e33" strokeWidth="4" strokeLinecap="round"/>
    </svg>
  ),
  heijunka: (
    <svg width="24" height="20" viewBox="0 0 52 44">
      <rect x="2" y="2" width="48" height="40" rx="3" fill="#f5f3ff" stroke="#7c3aed" strokeWidth="3"/>
      <line x1="2" y1="16" x2="50" y2="16" stroke="#7c3aed" strokeWidth="2"/>
      <line x1="2" y1="30" x2="50" y2="30" stroke="#7c3aed" strokeWidth="2"/>
      <line x1="18" y1="2" x2="18" y2="42" stroke="#7c3aed" strokeWidth="2"/>
      <line x1="35" y1="2" x2="35" y2="42" stroke="#7c3aed" strokeWidth="2"/>
    </svg>
  ),
};

export default function VsmIconPalette() {
  const addElement = useVsmStore((s) => s.addElement);
  return (
    <div className="panel-block">
      <div className="panel-title">Ícones VSM</div>
      <div className="vsm-palette-grid">
        {PALETTE_ITEMS.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            className="vsm-palette-btn"
            onClick={() => addElement(type)}
            title={`Adicionar ${label}`}
          >
            <span className="vsm-palette-icon">{MINI_ICONS[type]}</span>
            <span className="vsm-palette-label">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
