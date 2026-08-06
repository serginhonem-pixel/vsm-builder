// Kink points below are pre-computed with the project's approved formula:
// dx = x2-x1, dy = y2-y1, len = hypot(dx,dy), n = perpendicular unit vector, K = 8
// k1 = (x1 + dx*0.52 + nx*K, y1 + dy*0.52 + ny*K)
// k2 = (x1 + dx*0.44 - nx*K, y1 + dy*0.44 - ny*K)
// polyline: start -> k1 -> k2 -> end
export default function VsmMockup() {
  return (
    <svg
      className="vsm-mockup-svg"
      viewBox="0 0 640 220"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Diagrama simplificado de mapeamento de fluxo de valor"
    >
      <defs>
        <marker id="mockup-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" fill="var(--gray-600)" />
        </marker>
      </defs>

      {/* Fornecedor */}
      <rect x="20" y="70" width="140" height="80" rx="4" className="mockup-box" />
      <text x="90" y="105" textAnchor="middle" className="mockup-box-title">Fornecedor</text>
      <text x="90" y="126" textAnchor="middle" className="mockup-box-sub">Matéria-prima</text>

      {/* Processo */}
      <rect x="250" y="60" width="140" height="100" rx="4" className="mockup-box mockup-box-process" />
      <text x="320" y="100" textAnchor="middle" className="mockup-box-title">Processo</text>
      <text x="320" y="121" textAnchor="middle" className="mockup-box-sub">T/C 45s</text>
      <text x="320" y="138" textAnchor="middle" className="mockup-box-sub">T/R 10min</text>

      {/* Cliente */}
      <rect x="480" y="70" width="140" height="80" rx="4" className="mockup-box" />
      <text x="550" y="105" textAnchor="middle" className="mockup-box-title">Cliente</text>
      <text x="550" y="126" textAnchor="middle" className="mockup-box-sub">Produto acabado</text>

      {/* Seta eletrônica: Fornecedor -> Processo */}
      <polyline points="160,110 206.8,118 199.6,102 250,110" className="mockup-arrow" markerEnd="url(#mockup-arrow)" />

      {/* Seta eletrônica: Processo -> Cliente */}
      <polyline points="390,110 436.8,118 429.6,102 480,110" className="mockup-arrow" markerEnd="url(#mockup-arrow)" />

      {/* Estoque (WIP) sob cada seta */}
      <polygon points="195,150 215,150 205,168" className="mockup-stock" />
      <text x="205" y="182" textAnchor="middle" className="mockup-stock-label">WIP</text>

      <polygon points="425,150 445,150 435,168" className="mockup-stock" />
      <text x="435" y="182" textAnchor="middle" className="mockup-stock-label">WIP</text>
    </svg>
  );
}
