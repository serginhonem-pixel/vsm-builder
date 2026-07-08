import { useVsmStore } from '../../store/useVsmStore.js';
import './Yamazumi.css';

function ctToSec(p) {
  const v = parseFloat(String(p.ct).replace(',', '.')) || 0;
  if (p.ctUnit === 'Min') return v * 60;
  if (p.ctUnit === 'H')   return v * 3600;
  return v;
}

export default function Yamazumi({ onClose }) {
  const processes = useVsmStore((s) => s.processes);
  const demand    = useVsmStore((s) => s.demand);
  const available = useVsmStore((s) => s.available);
  const taktMin   = demand > 0 ? available / demand : 0;
  const taktSec   = taktMin * 60;

  const cts = processes.map(ctToSec);
  const maxVal = Math.max(...cts, taktSec, 1);

  const PW = 72, GAP = 20, PH = 260, MT = 20, ML = 48, MB = 48;
  const svgW = ML + processes.length * (PW + GAP) + 20;
  const svgH = PH + MT + MB;
  const scale = (v) => PH - (v / maxVal) * PH;

  const fmtSec = (s) => s >= 3600 ? `${(s/3600).toFixed(1)}h`
    : s >= 60 ? `${(s/60).toFixed(1)}m` : `${Math.round(s)}s`;

  const yTicks = 5;

  return (
    <div className="yamazumi-overlay" onClick={onClose}>
      <div className="yamazumi-modal" onClick={(e) => e.stopPropagation()}>
        <div className="yamazumi-header">
          <span className="yamazumi-title">Gráfico Yamazumi</span>
          <button className="yamazumi-close" onClick={onClose}>✕</button>
        </div>

        <div className="yamazumi-takt-info">
          <span>Takt: <strong>{fmtSec(taktSec)}</strong></span>
          {cts.some(c => c > taktSec) && (
            <span className="yamazumi-warn">⚠ {cts.filter(c => c > taktSec).length} processo(s) acima do Takt</span>
          )}
        </div>

        <div className="yamazumi-chart-wrap">
          <svg width={svgW} height={svgH} className="yamazumi-svg">
            {/* Y axis ticks */}
            {Array.from({ length: yTicks + 1 }, (_, i) => {
              const v = (maxVal / yTicks) * i;
              const y = MT + scale(v);
              return (
                <g key={i}>
                  <line x1={ML - 4} y1={y} x2={ML} y2={y} stroke="#aaa" strokeWidth="1"/>
                  <text x={ML - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#888">
                    {fmtSec(v)}
                  </text>
                  <line x1={ML} y1={y} x2={svgW - 10} y2={y} stroke="#eee" strokeWidth="1"/>
                </g>
              );
            })}

            {/* Y axis line */}
            <line x1={ML} y1={MT} x2={ML} y2={MT + PH} stroke="#ccc" strokeWidth="1"/>

            {/* Bars */}
            {processes.map((proc, i) => {
              const ct  = cts[i];
              const x   = ML + i * (PW + GAP) + GAP / 2;
              const bH  = (ct / maxVal) * PH;
              const y   = MT + PH - bH;
              const over = ct > taktSec;
              return (
                <g key={proc.id}>
                  <rect x={x} y={y} width={PW} height={bH}
                    fill={over ? '#fee2e2' : '#dcfce7'}
                    stroke={over ? '#e33' : '#16a34a'}
                    strokeWidth="1.5" rx="3"/>
                  <text x={x + PW / 2} y={y - 5} textAnchor="middle" fontSize="11"
                    fontWeight="700" fill={over ? '#e33' : '#15803d'}>
                    {fmtSec(ct)}
                  </text>
                  <text x={x + PW / 2} y={MT + PH + 16} textAnchor="middle"
                    fontSize="10" fill="#444" fontWeight="600">
                    {proc.name.length > 10 ? proc.name.slice(0, 10) + '…' : proc.name}
                  </text>
                </g>
              );
            })}

            {/* Takt line */}
            {taktSec > 0 && (
              <g>
                <line
                  x1={ML} y1={MT + scale(taktSec)}
                  x2={svgW - 10} y2={MT + scale(taktSec)}
                  stroke="#e33" strokeWidth="2" strokeDasharray="6,3"/>
                <text x={svgW - 8} y={MT + scale(taktSec) + 4}
                  fontSize="10" fill="#e33" fontWeight="700">
                  Takt
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
