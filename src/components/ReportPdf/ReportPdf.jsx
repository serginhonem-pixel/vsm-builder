import { forwardRef } from 'react';
import { useVsmStore } from '../../store/useVsmStore.js';
import './ReportPdf.css';

function ctToSec(p) {
  const v = parseFloat(String(p.ct).replace(',', '.')) || 0;
  if (p.ctUnit === 'Min') return v * 60;
  if (p.ctUnit === 'H')   return v * 3600;
  return v;
}
function fmtSec(s) {
  return s >= 3600 ? `${(s/3600).toFixed(1)}h` : s >= 60 ? `${(s/60).toFixed(1)}m` : `${Math.round(s)}s`;
}
function fmtMin(v) {
  if (!v || v <= 0) return '—';
  if (v >= 60) return `${(v/60).toFixed(1)}h`;
  if (v < 1)   return `${(v*60).toFixed(0)}s`;
  return `${v.toFixed(1)}m`;
}
function parsePct(s) {
  return Math.min(100, Math.max(0, parseFloat(String(s).replace('%','').replace(',','.')) || 0));
}

const ReportPdf = forwardRef(function ReportPdf(_, ref) {
  const processes = useVsmStore((s) => s.processes);
  const demand    = useVsmStore((s) => s.demand);
  const available = useVsmStore((s) => s.available);
  const lote      = useVsmStore((s) => s.lote);
  const wips      = useVsmStore((s) => s.wips);
  const activeState = useVsmStore((s) => s.activeState);

  const takt = demand > 0 ? available / demand : 0;
  const pitch = takt * (lote || 1);

  const ctToMin = (p) => {
    const v = parseFloat(String(p.ct).replace(',', '.')) || 0;
    if (p.ctUnit === 'Seg') return v / 60;
    if (p.ctUnit === 'H')   return v * 60;
    return v;
  };
  const totalTC   = processes.reduce((s, p) => s + ctToMin(p), 0);
  const totalWait = wips.reduce((s, w) => s + (parseFloat(w.qty)||0)*(parseFloat(w.factor)||1)*takt, 0);
  const lt  = totalTC + totalWait;
  const eff = lt > 0 ? (totalTC / lt) * 100 : 0;

  const taktSec = takt * 60;
  const cts = processes.map(ctToSec);
  const maxVal = Math.max(...cts, taktSec, 1);
  const PW = 64, GAP = 16, PH = 180, MT = 16, ML = 44, MB = 40;
  const svgW = ML + processes.length * (PW + GAP) + 16;
  const svgH = PH + MT + MB;
  const scale = (v) => PH - (v / maxVal) * PH;

  return (
    <div ref={ref} className="report-pdf">
      <div className="report-header">
        <div className="report-title">VSM Report — Estado {activeState === 'futuro' ? 'Futuro' : 'Atual'}</div>
        <div className="report-date">{new Date().toLocaleDateString('pt-BR')}</div>
      </div>

      {/* KPIs */}
      <div className="report-kpis">
        {[
          { l: 'Takt',      v: fmtMin(takt),  c: '#2563eb' },
          { l: 'Pitch',     v: fmtMin(pitch),  c: '#2563eb' },
          { l: 'Lead Time', v: fmtMin(lt),     c: '#e33' },
          { l: 'Proc.',     v: fmtMin(totalTC),c: '#d97706' },
          { l: 'Eficiência',v: eff.toFixed(0)+'%', c: '#15803d' },
          { l: 'Demanda',   v: `${demand} pç/dia`, c: '#111' },
        ].map(k => (
          <div key={k.l} className="report-kpi">
            <span className="report-kpi-l">{k.l}</span>
            <span className="report-kpi-v" style={{ color: k.c }}>{k.v}</span>
          </div>
        ))}
      </div>

      {/* Tabela de processos */}
      <div className="report-section-title">Processos</div>
      <table className="report-table">
        <thead>
          <tr>
            <th>Processo</th><th>TC</th><th>Turnos</th><th>Ops</th>
            <th>OEE</th><th>Pacemaker</th><th>Kaizen</th>
          </tr>
        </thead>
        <tbody>
          {processes.map((p) => {
            const oee = (parsePct(p.uptime) * parsePct(p.performance||'100%') * parsePct(p.quality||'100%') / 10000).toFixed(0);
            const ctSec = ctToSec(p);
            const over = ctSec > taktSec;
            return (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td style={{ color: over ? '#e33' : undefined }}>{fmtSec(ctSec)}</td>
                <td>{p.turnos || 1}T</td>
                <td>{p.ops}</td>
                <td>{oee}%</td>
                <td>{p.pacemaker ? '⬡ Sim' : '—'}</td>
                <td>{p.kaizen ? '✦ Sim' : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Yamazumi */}
      <div className="report-section-title">Yamazumi — CT vs Takt</div>
      <svg width={svgW} height={svgH} className="report-yama-svg">
        {[0,25,50,75,100].map(pct => {
          const v = (maxVal * pct / 100);
          const y = MT + scale(v);
          return (
            <g key={pct}>
              <line x1={ML} y1={y} x2={svgW-8} y2={y} stroke="#f0f0f0" strokeWidth="1"/>
              <text x={ML-4} y={y+4} textAnchor="end" fontSize="9" fill="#999">{fmtSec(v)}</text>
            </g>
          );
        })}
        <line x1={ML} y1={MT} x2={ML} y2={MT+PH} stroke="#ccc" strokeWidth="1"/>
        {processes.map((proc, i) => {
          const ct  = cts[i];
          const x   = ML + i * (PW + GAP) + GAP / 2;
          const bH  = (ct / maxVal) * PH;
          const y   = MT + PH - bH;
          const over = ct > taktSec;
          return (
            <g key={proc.id}>
              <rect x={x} y={y} width={PW} height={bH}
                fill={over ? '#fee2e2' : '#dcfce7'} stroke={over ? '#e33' : '#16a34a'} strokeWidth="1" rx="2"/>
              {bH > 14 && (
                <text x={x+PW/2} y={y+bH/2+4} textAnchor="middle" fontSize="10" fontWeight="700" fill={over ? '#e33' : '#15803d'}>
                  {fmtSec(ct)}
                </text>
              )}
              <text x={x+PW/2} y={MT+PH+14} textAnchor="middle" fontSize="9" fill="#555">
                {proc.name.length > 9 ? proc.name.slice(0,9)+'…' : proc.name}
              </text>
            </g>
          );
        })}
        {taktSec > 0 && (
          <g>
            <line x1={ML} y1={MT+scale(taktSec)} x2={svgW-8} y2={MT+scale(taktSec)}
              stroke="#e33" strokeWidth="1.5" strokeDasharray="5,3"/>
            <text x={svgW-6} y={MT+scale(taktSec)+4} fontSize="9" fill="#e33" fontWeight="700">Takt</text>
          </g>
        )}
      </svg>

      {/* Plano de ação */}
      {processes.some(p => p.kaizen && (p.acoes||[]).length > 0) && (
        <>
          <div className="report-section-title">Plano de Ação</div>
          <table className="report-table">
            <thead><tr><th>Processo</th><th>O quê</th><th>Quem</th><th>Quando</th></tr></thead>
            <tbody>
              {processes.filter(p => p.kaizen).flatMap(p =>
                (p.acoes||[]).map(a => (
                  <tr key={a.id}>
                    <td>{p.name}</td>
                    <td>{a.oQue || '—'}</td>
                    <td>{a.quem || '—'}</td>
                    <td>{a.quando || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
});

export default ReportPdf;
