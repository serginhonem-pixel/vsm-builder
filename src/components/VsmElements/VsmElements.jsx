import { useRef } from 'react';
import { useVsmStore } from '../../store/useVsmStore.js';
import './VsmElements.css';

const ICONS = {
  kaizen: ({ size = 52 }) => (
    <svg width={size} height={size} viewBox="0 0 52 52">
      <polygon points="26,2 30,18 44,10 36,23 52,24 38,32 46,46 30,38 28,52 20,38 6,48 12,33 0,26 16,22 10,8 24,18"
        fill="#ff6600" stroke="#cc4400" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
  operador: ({ size = 48 }) => (
    <svg width={size} height={size} viewBox="0 0 48 52">
      <circle cx="24" cy="8" r="7" fill="none" stroke="#333" strokeWidth="2"/>
      <line x1="24" y1="15" x2="24" y2="35" stroke="#333" strokeWidth="2.5"/>
      <line x1="24" y1="22" x2="10" y2="30" stroke="#333" strokeWidth="2"/>
      <line x1="24" y1="22" x2="38" y2="30" stroke="#333" strokeWidth="2"/>
      <line x1="24" y1="35" x2="14" y2="50" stroke="#333" strokeWidth="2"/>
      <line x1="24" y1="35" x2="34" y2="50" stroke="#333" strokeWidth="2"/>
    </svg>
  ),
  fifo: ({ size = 56, idPrefix = '' }) => (
    <svg width={size} height={34} viewBox="0 0 56 34">
      <rect x="1" y="1" width="54" height="32" rx="4" fill="#e8f4ff" stroke="#2563eb" strokeWidth="2"/>
      <text x="28" y="15" textAnchor="middle" fontFamily="monospace" fontWeight="800" fontSize="10" fill="#2563eb">FIFO</text>
      <line x1="8" y1="24" x2="44" y2="24" stroke="#2563eb" strokeWidth="1.5"
        markerEnd={`url(#${idPrefix}fifo-arrow)`}/>
      <defs>
        <marker id={`${idPrefix}fifo-arrow`} markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
          <polygon points="0 0,6 2.5,0 5" fill="#2563eb"/>
        </marker>
      </defs>
    </svg>
  ),
  supermercado: ({ size = 52 }) => (
    <svg width={size} height={48} viewBox="0 0 52 48">
      <rect x="2" y="6" width="48" height="38" rx="2" fill="#fff" stroke="#333" strokeWidth="2"/>
      <line x1="2" y1="20" x2="50" y2="20" stroke="#333" strokeWidth="1.5"/>
      <line x1="2" y1="34" x2="50" y2="34" stroke="#333" strokeWidth="1.5"/>
      <line x1="18" y1="6" x2="18" y2="44" stroke="#333" strokeWidth="1.5"/>
      <line x1="34" y1="6" x2="34" y2="44" stroke="#333" strokeWidth="1.5"/>
      <text x="26" y="5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#555">SM</text>
    </svg>
  ),
  kanban: ({ size = 44 }) => (
    <svg width={size} height={52} viewBox="0 0 44 52">
      <rect x="2" y="2" width="40" height="30" rx="3" fill="#fef3c7" stroke="#d97706" strokeWidth="2"/>
      <line x1="8" y1="12" x2="36" y2="12" stroke="#d97706" strokeWidth="1.5"/>
      <line x1="8" y1="20" x2="28" y2="20" stroke="#d97706" strokeWidth="1.5"/>
      <text x="22" y="9" textAnchor="middle" fontSize="7" fontWeight="700" fill="#d97706">KANBAN</text>
      <polygon points="22,34 14,48 30,48" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5"/>
    </svg>
  ),
  qualidade: ({ size = 48 }) => (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="21" fill="#fff0f0" stroke="#e33" strokeWidth="2.5"/>
      <line x1="14" y1="14" x2="34" y2="34" stroke="#e33" strokeWidth="3" strokeLinecap="round"/>
      <line x1="34" y1="14" x2="14" y2="34" stroke="#e33" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  ),
  heijunka: ({ size = 52 }) => (
    <svg width={size} height={44} viewBox="0 0 52 44">
      <rect x="2" y="2" width="48" height="40" rx="3" fill="#f5f3ff" stroke="#7c3aed" strokeWidth="2"/>
      <line x1="2" y1="14" x2="50" y2="14" stroke="#7c3aed" strokeWidth="1.5"/>
      <line x1="2" y1="28" x2="50" y2="28" stroke="#7c3aed" strokeWidth="1.5"/>
      <line x1="18" y1="2" x2="18" y2="42" stroke="#7c3aed" strokeWidth="1.5"/>
      <line x1="35" y1="2" x2="35" y2="42" stroke="#7c3aed" strokeWidth="1.5"/>
      <text x="26" y="40" textAnchor="middle" fontSize="7" fontWeight="700" fill="#7c3aed">HEIJUNKA</text>
    </svg>
  ),
};

const LABELS = {
  kaizen:       'Kaizen',
  operador:     'Operador',
  fifo:         'FIFO',
  supermercado: 'Supermercado',
  kanban:       'Kanban',
  qualidade:    'Qualidade',
  heijunka:     'Heijunka',
};

function VsmElement({ el, zoom, readOnly, idPrefix }) {
  const updateElement = useVsmStore((s) => s.updateElement);
  const setSelected   = useVsmStore((s) => s.setSelected);
  const selectedId    = useVsmStore((s) => s.selectedId);
  const dragging      = useRef(false);
  const startPos      = useRef({ mx: 0, my: 0, ex: 0, ey: 0 });
  const Icon = ICONS[el.type];

  const onMouseDown = (e) => {
    if (readOnly) return;
    e.stopPropagation();
    setSelected(el.id);
    dragging.current = true;
    startPos.current = { mx: e.clientX, my: e.clientY, ex: el.x, ey: el.y };

    const onMove = (ev) => {
      if (!dragging.current) return;
      const dx = (ev.clientX - startPos.current.mx) / (zoom || 1);
      const dy = (ev.clientY - startPos.current.my) / (zoom || 1);
      updateElement(el.id, { x: startPos.current.ex + dx, y: startPos.current.ey + dy });
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const isSelected = !readOnly && selectedId === el.id;

  return (
    <div
      className={`vsm-el${isSelected ? ' vsm-el--selected' : ''}`}
      style={{ left: el.x, top: el.y }}
      onMouseDown={onMouseDown}
    >
      {Icon && <Icon idPrefix={idPrefix} />}
      <span className="vsm-el-label">{el.label || LABELS[el.type]}</span>
    </div>
  );
}

export default function VsmElements({ zoom, elements: elementsProp, readOnly = false, idPrefix = '' }) {
  const liveElements = useVsmStore((s) => s.elements);
  const elements = elementsProp !== undefined ? elementsProp : liveElements;
  if (!elements.length) return null;
  return (
    <div className="vsm-elements-overlay">
      {elements.map((el) => (
        <VsmElement key={el.id} el={el} zoom={zoom} readOnly={readOnly} idPrefix={idPrefix} />
      ))}
    </div>
  );
}
