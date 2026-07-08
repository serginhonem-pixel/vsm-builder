import { useState } from 'react';
import { useVsmStore } from '../../store/useVsmStore.js';
import './ShingoDiagram.css';

// ── Tipos (Simbologia Shingo) ─────────────────────────────────────────────────
const TYPES = [
  { key: 'op',          label: 'Processamento',   color: '#16a34a' },  // ● verde
  { key: 'nva',         label: 'NVA Necessária',  color: '#dc2626' },  // ● vermelho
  { key: 'insp',        label: 'Inspeção',         color: '#ca8a04' },  // ◇ amarelo
  { key: 'espera_lote', label: 'Espera de Lote',   color: '#db2777' },  // ✡ rosa
  { key: 'trans',       label: 'Transporte',       color: '#111827' },  // ● preto
  { key: 'espera_proc', label: 'Espera p/ Proc.',  color: '#b91c1c' },  // ▽ vermelho
  { key: 'stock_mp',    label: 'Estoque MP/SA',    color: '#1d4ed8' },  // ▲ azul
  { key: 'stock_sa',    label: 'Estoque SA/PA',    color: '#1e3a8a' },  // ▼ azul escuro
];

// migração de chaves antigas (ASME → Shingo)
const resolveType = (k) => {
  if (k === 'wait')  return 'espera_proc';
  if (k === 'stock') return 'stock_sa';
  return k || 'op';
};

// estrela de N pontas
function starPoints(cx, cy, outerR, innerR, n) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i * Math.PI) / n - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(' ');
}

const VIEWS = [
  { key: 'linha',    label: 'Linha',    icon: '⟶' },
  { key: 'faixas',   label: 'Faixas',   icon: '⊟' },
  { key: 'tabela',   label: 'Tabela',   icon: '☰' },
  { key: 'yamazumi', label: 'Yamazumi', icon: '▦' },
];

const STEP_W = 160;
const SYM_R  = 22;

// ── Helpers ──────────────────────────────────────────────────────────────────
const toSec = (t, u) => {
  const v = parseFloat(String(t).replace(',', '.')) || 0;
  return u === 'Min' ? v * 60 : u === 'H' ? v * 3600 : v;
};
const fmtSec = (s) =>
  s >= 3600 ? (s / 3600).toFixed(1) + 'h' : s >= 60 ? (s / 60).toFixed(1) + 'min' : Math.round(s) + 's';

// ── Símbolo SVG (Simbologia Shingo) ──────────────────────────────────────────
const STROKE = 'rgba(0,0,0,0.22)';

function ShapeCircle({ cx, cy, r, fill }) {
  return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={STROKE} strokeWidth="1.5"/>;
}
function ShapeDiamond({ cx, cy, r, fill }) {
  const pts = `${cx},${cy-r} ${cx+r},${cy} ${cx},${cy+r} ${cx-r},${cy}`;
  const h   = r * 0.58;
  const dark = '#78350f';
  return (
    <g>
      <polygon points={pts} fill={fill} stroke={dark} strokeWidth="1.5"/>
      <line x1={cx-h} y1={cy-h} x2={cx+h} y2={cy+h} stroke={dark} strokeWidth="1.5"/>
      <line x1={cx+h} y1={cy-h} x2={cx-h} y2={cy+h} stroke={dark} strokeWidth="1.5"/>
    </g>
  );
}
function ShapeStar({ cx, cy, r, fill }) {
  return <polygon points={starPoints(cx, cy, r, r * 0.38, 6)} fill={fill} stroke={STROKE} strokeWidth="1"/>;
}
function ShapeTriUp({ cx, cy, r, fill }) {
  const pts = `${cx},${cy-r} ${cx+r*0.9},${cy+r*0.8} ${cx-r*0.9},${cy+r*0.8}`;
  return <polygon points={pts} fill={fill} stroke={STROKE} strokeWidth="1.5"/>;
}
function ShapeTriDown({ cx, cy, r, fill, outline }) {
  const pts = `${cx-r*0.9},${cy-r*0.8} ${cx+r*0.9},${cy-r*0.8} ${cx},${cy+r}`;
  return outline
    ? <polygon points={pts} fill="none" stroke={fill} strokeWidth="2.5" strokeLinejoin="round"/>
    : <polygon points={pts} fill={fill} stroke={STROKE} strokeWidth="1.5"/>;
}

function StepSymbol({ typeKey, cx, cy, color, selected, r = SYM_R }) {
  const k    = resolveType(typeKey);
  const glow = selected && <circle cx={cx} cy={cy} r={r + 8} fill={color} opacity="0.15"/>;

  const map = {
    op:          <ShapeCircle  cx={cx} cy={cy} r={r} fill={color}/>,
    nva:         <ShapeCircle  cx={cx} cy={cy} r={r} fill={color}/>,
    trans:       <ShapeCircle  cx={cx} cy={cy} r={r * 0.5} fill={color}/>,
    insp:        <ShapeDiamond cx={cx} cy={cy} r={r} fill={color}/>,
    espera_lote: <ShapeStar    cx={cx} cy={cy} r={r} fill={color}/>,
    espera_proc: <ShapeTriDown cx={cx} cy={cy} r={r} fill={color} outline/>,
    stock_mp:    <ShapeTriUp   cx={cx} cy={cy} r={r} fill={color}/>,
    stock_sa:    <ShapeTriDown cx={cx} cy={cy} r={r} fill={color}/>,
  };

  return <g>{glow}{map[k] ?? map.op}</g>;
}

function TypeIcon({ typeKey, color, size = 18 }) {
  const r = size / 2 - 1.5, c = size / 2;
  const k = resolveType(typeKey);

  const icons = {
    op:          <ShapeCircle  cx={c} cy={c} r={r} fill={color}/>,
    nva:         <ShapeCircle  cx={c} cy={c} r={r} fill={color}/>,
    trans:       <ShapeCircle  cx={c} cy={c} r={r * 0.5} fill={color}/>,
    insp:        <ShapeDiamond cx={c} cy={c} r={r} fill={color}/>,
    espera_lote: <ShapeStar    cx={c} cy={c} r={r} fill={color}/>,
    espera_proc: <ShapeTriDown cx={c} cy={c} r={r} fill={color} outline/>,
    stock_mp:    <ShapeTriUp   cx={c} cy={c} r={r} fill={color}/>,
    stock_sa:    <ShapeTriDown cx={c} cy={c} r={r} fill={color}/>,
  };

  return <svg width={size} height={size}>{icons[k] ?? icons.op}</svg>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 1: Linha
// ═══════════════════════════════════════════════════════════════════════════════
function ViewLinha({ steps, selectedId, onSelect, onAdd, onAddAt, onDeselect }) {
  const [hoveredGap, setHoveredGap] = useState(null);
  const LINE_Y = 90, SVG_H = 210, PAD_L = 32, PAD_R = 80;
  const svgW = PAD_L + Math.max(steps.length, 1) * STEP_W + PAD_R;
  const cx = (i) => PAD_L + i * STEP_W + STEP_W / 2;

  return (
    <svg width={svgW} height={SVG_H} className="shingo-svg" onClick={onDeselect}>
      <defs>
        <marker id="arr-l" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
          <polygon points="0 0,9 3.5,0 7" fill="#9ca3af"/>
        </marker>
      </defs>
      <line x1={PAD_L} y1={LINE_Y} x2={svgW - PAD_R + 44} y2={LINE_Y} stroke="#d1d5db" strokeWidth="2"/>

      {/* Conectores entre passos + botão '+' no meio de cada gap */}
      {steps.slice(1).map((s, i) => {
        const x1 = cx(i) + SYM_R + 2, x2 = cx(i+1) - SYM_R - 2;
        const mx = (cx(i) + cx(i+1)) / 2;
        const hovered = hoveredGap === i;
        return (
          <g key={s.id+'-gap'}>
            <line x1={x1} y1={LINE_Y} x2={hovered ? mx - 12 : x2} y2={LINE_Y}
              stroke="#9ca3af" strokeWidth="2" markerEnd={hovered ? undefined : 'url(#arr-l)'}/>
            {hovered && <line x1={mx + 12} y1={LINE_Y} x2={x2} y2={LINE_Y}
              stroke="#9ca3af" strokeWidth="2" markerEnd="url(#arr-l)"/>}
            {/* zona de hover invisível sobre o conector */}
            <rect x={x1} y={LINE_Y - 16} width={x2 - x1} height={32} fill="transparent"
              style={{cursor:'pointer'}}
              onMouseEnter={() => setHoveredGap(i)}
              onMouseLeave={() => setHoveredGap(null)}
              onClick={(e) => { e.stopPropagation(); onAddAt(i); }}/>
            {/* '+' visível só quando hover */}
            {hovered && (
              <g style={{pointerEvents:'none'}}>
                <circle cx={mx} cy={LINE_Y} r={12} fill="#eff6ff" stroke="#93c5fd" strokeWidth="1.5"/>
                <text x={mx} y={LINE_Y + 5} textAnchor="middle" fontSize="16" fill="#3b82f6" style={{userSelect:'none'}}>+</text>
              </g>
            )}
          </g>
        );
      })}

      {/* '+' no final */}
      <g style={{cursor:'pointer'}} onClick={(e)=>{e.stopPropagation();onAdd('op');}}>
        <circle cx={svgW-PAD_R+22} cy={LINE_Y} r={17} fill="#eff6ff" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="4,3"/>
        <text x={svgW-PAD_R+22} y={LINE_Y+6} textAnchor="middle" fontSize="20" fill="#3b82f6" style={{userSelect:'none'}}>+</text>
      </g>

      {steps.map((step, i) => {
        const t = TYPES.find(t=>t.key===resolveType(step.type))||TYPES[0];
        const x = cx(i), sel = step.id===selectedId;
        return (
          <g key={step.id} style={{cursor:'pointer'}} onClick={(e)=>{e.stopPropagation();onSelect(step.id);}}>
            <text x={x} y={LINE_Y-SYM_R-10} textAnchor="middle" fontSize="11" fill="#9ca3af" fontWeight="600">{i+1}</text>
            <StepSymbol typeKey={step.type} cx={x} cy={LINE_Y} color={t.color} selected={sel}/>
            <text x={x} y={LINE_Y+SYM_R+17} textAnchor="middle" fontSize="12"
              fill={sel?t.color:'#374151'} fontWeight={sel?'700':'500'}>{(step.name||'—').slice(0,16)}</text>
            <text x={x} y={LINE_Y+SYM_R+32} textAnchor="middle" fontSize="10" fill="#9ca3af">
              {step.time&&step.time!=='0'?`${step.time} ${step.timeUnit||'Seg'}`:'—'}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 2: Faixas (swim-lane)
// ═══════════════════════════════════════════════════════════════════════════════
function ViewFaixas({ steps, selectedId, onSelect, onAdd, onDeselect }) {
  const TH = 90, PAD = 16, LW = 110;
  const svgH = PAD * 2 + TYPES.length * TH;
  const svgW = LW + Math.max(steps.length + 1, 3) * STEP_W;
  const ty = (key) => { const i = TYPES.findIndex(t=>t.key===resolveType(key)); return PAD + (i < 0 ? 0 : i) * TH + TH/2; };
  const sx = (i)   => LW + i * STEP_W + STEP_W/2;

  return (
    <svg width={svgW} height={svgH} className="shingo-svg" onClick={onDeselect}>
      <defs>
        <marker id="arr-f" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
          <polygon points="0 0,9 3.5,0 7" fill="#9ca3af"/>
        </marker>
      </defs>
      {TYPES.map((t, ti) => {
        const y = PAD + ti * TH;
        return (
          <g key={t.key}>
            <rect x={0} y={y} width={svgW} height={TH} fill={ti%2===0?'#fafafa':'#f3f4f6'}/>
            <line x1={LW} y1={ty(t.key)} x2={svgW} y2={ty(t.key)} stroke={t.color} strokeWidth="1" strokeDasharray="5,5" opacity="0.35"/>
            <line x1={0} y1={y} x2={svgW} y2={y} stroke="#e5e7eb" strokeWidth="1"/>
            <text x={LW-8} y={ty(t.key)} textAnchor="end" dominantBaseline="middle"
              fontSize="12" fontWeight="600" fill={t.color}>{t.label}</text>
            {/* clique para adicionar */}
            <rect x={LW+steps.length*STEP_W} y={y} width={STEP_W} height={TH}
              fill="transparent" style={{cursor:'pointer'}}
              onClick={(e)=>{e.stopPropagation();onAdd(t.key);}}/>
            <text x={LW+steps.length*STEP_W+STEP_W/2} y={ty(t.key)+6}
              textAnchor="middle" fontSize="22" fill={t.color} opacity="0.3"
              style={{pointerEvents:'none',userSelect:'none'}}>+</text>
          </g>
        );
      })}
      <line x1={0} y1={PAD+TYPES.length*TH} x2={svgW} y2={PAD+TYPES.length*TH} stroke="#e5e7eb" strokeWidth="1"/>
      <line x1={LW} y1={0} x2={LW} y2={svgH} stroke="#d1d5db" strokeWidth="1"/>
      {steps.slice(1).map((step, i) => {
        const x1=sx(i), y1=ty(steps[i].type), x2=sx(i+1), y2=ty(step.type);
        const d = y1===y2 ? `M${x1} ${y1} L${x2} ${y2}`
          : `M${x1} ${y1} C${(x1+x2)/2} ${y1},${(x1+x2)/2} ${y2},${x2} ${y2}`;
        return <path key={step.id+'-c'} d={d} stroke="#9ca3af" strokeWidth="1.5" fill="none" markerEnd="url(#arr-f)"/>;
      })}
      {steps.map((step, i) => {
        const t=TYPES.find(t=>t.key===resolveType(step.type))||TYPES[0];
        const x=sx(i), y=ty(step.type), sel=step.id===selectedId;
        return (
          <g key={step.id} style={{cursor:'pointer'}} onClick={(e)=>{e.stopPropagation();onSelect(step.id);}}>
            <text x={x} y={y-SYM_R-7} textAnchor="middle" fontSize="10" fill="#9ca3af" fontWeight="600">{i+1}</text>
            <StepSymbol typeKey={step.type} cx={x} cy={y} color={t.color} selected={sel} r={20}/>
            <text x={x} y={y+SYM_R+13} textAnchor="middle" fontSize="11"
              fill={sel?t.color:'#374151'} fontWeight={sel?'700':'400'}>{(step.name||'—').slice(0,14)}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 3: Tabela
// ═══════════════════════════════════════════════════════════════════════════════
function ViewTabela({ steps, selectedId, onSelect, onAdd, onUpdate, onDelete }) {
  return (
    <div className="shingo-table-wrap">
      <table className="shingo-table">
        <thead>
          <tr>
            <th>#</th>
            <th style={{textAlign:'left'}}>Descrição</th>
            {TYPES.map(t=>(
              <th key={t.key} title={t.label}>
                <TypeIcon typeKey={t.key} color={t.color} size={18}/>
              </th>
            ))}
            <th>Tempo</th>
            <th>Un</th>
            <th>Dist (m)</th>
            <th>VA</th>
            <th>Obs</th>
            <th/>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, i) => {
            const t = TYPES.find(t=>t.key===resolveType(step.type))||TYPES[0];
            const sel = step.id===selectedId;
            return (
              <tr key={step.id} className={sel?'row-selected':step.va?'row-va':'row-nva'}
                onClick={()=>onSelect(step.id)}>
                <td className="td-num">{i+1}</td>
                <td><input className="shingo-inp" value={step.name} placeholder="Descrição"
                  onClick={e=>e.stopPropagation()}
                  onChange={e=>onUpdate(step.id,{name:e.target.value})}/></td>
                {TYPES.map(tp=>(
                  <td key={tp.key} className="td-sym">
                    <div className="sym-line"/>
                    <button type="button" className={`sym-btn${step.type===tp.key?' sym-active':''}`}
                      onClick={e=>{e.stopPropagation();onUpdate(step.id,{type:tp.key});}}>
                      <TypeIcon typeKey={tp.key} color={step.type===tp.key?tp.color:'#d1d5db'} size={20}/>
                    </button>
                  </td>
                ))}
                <td><input className="shingo-inp shingo-inp-sm" value={step.time}
                  onClick={e=>e.stopPropagation()}
                  onChange={e=>onUpdate(step.id,{time:e.target.value})}/></td>
                <td>
                  <select className="shingo-sel" value={step.timeUnit||'Seg'}
                    onClick={e=>e.stopPropagation()}
                    onChange={e=>onUpdate(step.id,{timeUnit:e.target.value})}>
                    <option>Seg</option><option>Min</option><option>H</option>
                  </select>
                </td>
                <td><input className="shingo-inp shingo-inp-sm" value={step.dist||''} placeholder="0"
                  onClick={e=>e.stopPropagation()}
                  onChange={e=>onUpdate(step.id,{dist:e.target.value})}/></td>
                <td className="td-va">
                  <button type="button" className={`shingo-va-btn ${step.va?'va':'nva'}`}
                    onClick={e=>{e.stopPropagation();onUpdate(step.id,{va:!step.va});}}>
                    {step.va?'VA':'NVA'}
                  </button>
                </td>
                <td><input className="shingo-inp" value={step.notes} placeholder="—"
                  onClick={e=>e.stopPropagation()}
                  onChange={e=>onUpdate(step.id,{notes:e.target.value})}/></td>
                <td>
                  <button type="button" className="shingo-del"
                    onClick={e=>{e.stopPropagation();onDelete(step.id);}}>✕</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 4: Yamazumi (gráfico de barras empilhadas por tipo)
// ═══════════════════════════════════════════════════════════════════════════════
function ViewYamazumi({ steps }) {
  if (steps.length === 0) return <div className="shingo-empty"><p>Sem dados para exibir.</p></div>;

  const BAR_W = 80, GAP = 24, PAD_L = 60, PAD_B = 60, PAD_T = 20, CHART_H = 280;

  const maxSec = Math.max(...steps.map(s => toSec(s.time, s.timeUnit)), 1);
  const svgW = PAD_L + steps.length * (BAR_W + GAP) + GAP;
  const svgH = CHART_H + PAD_B + PAD_T;
  const barH = (sec) => (sec / maxSec) * CHART_H;

  // Totais por tipo
  const totals = TYPES.map(t => ({
    ...t,
    sec: steps.filter(s=>s.type===t.key).reduce((sum,s)=>sum+toSec(s.time,s.timeUnit),0),
  }));
  const totalSec = steps.reduce((s,p)=>s+toSec(p.time,p.timeUnit),0);
  const vaSec    = steps.filter(s=>s.va).reduce((sum,s)=>sum+toSec(s.time,s.timeUnit),0);

  return (
    <div className="yamazumi-wrap">
      <svg width={svgW} height={svgH} className="shingo-svg">
        {/* Eixo Y */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T+CHART_H} stroke="#d1d5db" strokeWidth="1.5"/>
        <line x1={PAD_L} y1={PAD_T+CHART_H} x2={svgW} y2={PAD_T+CHART_H} stroke="#d1d5db" strokeWidth="1.5"/>
        {[0,25,50,75,100].map(pct=>{
          const y = PAD_T + CHART_H - (pct/100)*CHART_H;
          const val = (maxSec * pct/100);
          return (
            <g key={pct}>
              <line x1={PAD_L-4} y1={y} x2={svgW} y2={y} stroke="#f3f4f6" strokeWidth="1"/>
              <text x={PAD_L-8} y={y+4} textAnchor="end" fontSize="10" fill="#9ca3af">
                {fmtSec(val)}
              </text>
            </g>
          );
        })}

        {/* Barras */}
        {steps.map((step, i) => {
          const t = TYPES.find(t=>t.key===resolveType(step.type))||TYPES[0];
          const sec = toSec(step.time, step.timeUnit);
          const h = barH(sec);
          const x = PAD_L + GAP + i * (BAR_W + GAP);
          const y = PAD_T + CHART_H - h;
          return (
            <g key={step.id}>
              <rect x={x} y={y} width={BAR_W} height={h}
                fill={t.color} rx="4" opacity={step.va?1:0.45}/>
              {h > 18 && (
                <text x={x+BAR_W/2} y={y+h/2+4} textAnchor="middle"
                  fontSize="11" fill="#fff" fontWeight="600">{fmtSec(sec)}</text>
              )}
              {/* Rótulo abaixo */}
              <text x={x+BAR_W/2} y={PAD_T+CHART_H+16} textAnchor="middle" fontSize="10" fill="#6b7280">{i+1}</text>
              <text x={x+BAR_W/2} y={PAD_T+CHART_H+28} textAnchor="middle" fontSize="10" fill="#374151">
                {(step.name||'—').slice(0,10)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legenda / resumo por tipo */}
      <div className="yamazumi-legend">
        {totals.filter(t=>t.sec>0).map(t=>(
          <div key={t.key} className="yama-legend-item">
            <span className="yama-color" style={{background:t.color}}/>
            <span>{t.label}</span>
            <strong>{fmtSec(t.sec)}</strong>
            <span className="yama-pct">{totalSec>0?Math.round(t.sec/totalSec*100):0}%</span>
          </div>
        ))}
        <div className="yama-total">
          <span>Total VA</span>
          <strong style={{color:'#065f46'}}>{fmtSec(vaSec)} ({totalSec>0?Math.round(vaSec/totalSec*100):0}%)</strong>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Painel lateral de edição
// ═══════════════════════════════════════════════════════════════════════════════
function EditPanel({ step, onUpdate, onDelete, onClose }) {
  if (!step) return (
    <div className="shingo-edit-empty">
      <p>Clique em um passo para editar</p>
      <p className="shingo-edit-hint">ou "+" para adicionar</p>
    </div>
  );
  const t = TYPES.find(t=>t.key===resolveType(step.type))||TYPES[0];
  return (
    <div className="shingo-edit-panel">
      <div className="shingo-edit-header" style={{borderColor:t.color}}>
        <TypeIcon typeKey={step.type} color={t.color} size={20}/>
        <span style={{color:t.color,fontWeight:700}}>{t.label}</span>
        <button type="button" className="shingo-del" onClick={onClose}>✕</button>
      </div>
      <div className="shingo-edit-field">
        <label>Descrição</label>
        <input value={step.name} placeholder="Nome da atividade" onChange={e=>onUpdate({name:e.target.value})}/>
      </div>
      <div className="shingo-edit-field">
        <label>Tipo</label>
        <div className="shingo-type-btns">
          {TYPES.map(tp=>(
            <button key={tp.key} type="button"
              className={`type-btn${step.type===tp.key?' active':''}`}
              style={step.type===tp.key?{borderColor:tp.color,background:tp.color+'15',color:tp.color}:{}}
              onClick={()=>onUpdate({type:tp.key})}>
              <TypeIcon typeKey={tp.key} color={step.type===tp.key?tp.color:'#9ca3af'} size={15}/>
              <span>{tp.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="shingo-edit-row">
        <div className="shingo-edit-field">
          <label>Tempo</label>
          <input value={step.time} onChange={e=>onUpdate({time:e.target.value})}/>
        </div>
        <div className="shingo-edit-field">
          <label>Un</label>
          <select value={step.timeUnit||'Seg'} onChange={e=>onUpdate({timeUnit:e.target.value})}>
            <option>Seg</option><option>Min</option><option>H</option>
          </select>
        </div>
      </div>
      <div className="shingo-edit-field">
        <label>Distância (m)</label>
        <input value={step.dist||''} placeholder="0" onChange={e=>onUpdate({dist:e.target.value})}/>
      </div>
      <div className="shingo-edit-field">
        <label>Observações</label>
        <textarea rows={2} value={step.notes} placeholder="—" onChange={e=>onUpdate({notes:e.target.value})}/>
      </div>
      <div className="shingo-edit-va">
        <button type="button" className={`shingo-va-btn ${step.va?'va':'nva'}`}
          onClick={()=>onUpdate({va:!step.va})}>
          {step.va?'✓ Agrega Valor (VA)':'✗ Não Agrega (NVA)'}
        </button>
      </div>
      <button type="button" className="shingo-del-full" onClick={onDelete}>Remover passo</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Principal
// ═══════════════════════════════════════════════════════════════════════════════
export default function ShingoDiagram({ onBack }) {
  const [selectedId, setSelectedId] = useState(null);
  const [view, setView]             = useState('linha');

  const steps               = useVsmStore(s=>s.shingoSteps);
  const initShingoFromVsm   = useVsmStore(s=>s.initShingoFromVsm);
  const addShingoStep       = useVsmStore(s=>s.addShingoStep);
  const insertShingoStepAt  = useVsmStore(s=>s.insertShingoStepAt);
  const removeShingoStep    = useVsmStore(s=>s.removeShingoStep);
  const updateShingoStep    = useVsmStore(s=>s.updateShingoStep);
  const clearShingo         = useVsmStore(s=>s.clearShingo);

  const selectedStep = steps.find(s=>s.id===selectedId)||null;

  const handleAdd = (typeKey='op') => {
    addShingoStep();
    setTimeout(()=>{
      const last = useVsmStore.getState().shingoSteps.slice(-1)[0];
      if (last) { updateShingoStep(last.id,{type:typeKey}); setSelectedId(last.id); }
    }, 0);
  };

  const handleInsertAt = (afterIndex) => {
    insertShingoStepAt(afterIndex);
    setTimeout(()=>{
      const all = useVsmStore.getState().shingoSteps;
      const inserted = all[afterIndex + 1];
      if (inserted) setSelectedId(inserted.id);
    }, 0);
  };

  const handleDelete = (id) => {
    removeShingoStep(id||selectedId);
    setSelectedId(null);
  };

  const totalSec = steps.reduce((s,p)=>s+toSec(p.time,p.timeUnit),0);
  const vaSec    = steps.filter(p=>p.va).reduce((s,p)=>s+toSec(p.time,p.timeUnit),0);

  const isVisual = view==='linha'||view==='faixas';

  return (
    <div className="shingo-page">
      <div className="shingo-modal">

        {/* Header */}
        <div className="shingo-header">
          <h2>Diagrama de Fluxo de Processo</h2>

          {/* Seletor de visualização */}
          <div className="view-switcher">
            {VIEWS.map(v=>(
              <button key={v.key} type="button"
                className={`view-btn${view===v.key?' active':''}`}
                onClick={()=>setView(v.key)}>
                <span className="view-icon">{v.icon}</span>
                <span>{v.label}</span>
              </button>
            ))}
          </div>

          <div className="shingo-header-actions">
            {steps.length===0
              ? <button type="button" className="shingo-btn-primary" onClick={()=>{initShingoFromVsm();setSelectedId(null);}}>Importar do VSM</button>
              : <button type="button" className="shingo-btn" onClick={()=>{clearShingo();setSelectedId(null);}}>Limpar</button>
            }
            <button type="button" className="shingo-btn" onClick={()=>window.print()}>Imprimir</button>
          </div>
        </div>

        {/* Body */}
        <div className="shingo-body">
          <div className="shingo-canvas-area" onClick={()=>setSelectedId(null)}>
            {steps.length===0?(
              <div className="shingo-empty">
                <p>Nenhuma atividade ainda.</p>
                <button type="button" className="shingo-btn-primary" onClick={initShingoFromVsm}>
                  Importar processos do VSM
                </button>
              </div>
            ):(
              <div className={`shingo-canvas-scroll${view==='faixas'?' scroll-faixas':''}`}>
                {view==='linha'    && <ViewLinha    steps={steps} selectedId={selectedId} onSelect={setSelectedId} onAdd={handleAdd} onAddAt={handleInsertAt} onDeselect={()=>setSelectedId(null)}/>}
                {view==='faixas'   && <ViewFaixas   steps={steps} selectedId={selectedId} onSelect={setSelectedId} onAdd={handleAdd} onDeselect={()=>setSelectedId(null)}/>}
                {view==='tabela'   && <ViewTabela   steps={steps} selectedId={selectedId} onSelect={setSelectedId} onAdd={handleAdd} onUpdate={(id,p)=>updateShingoStep(id,p)} onDelete={handleDelete}/>}
                {view==='yamazumi' && <ViewYamazumi steps={steps}/>}
              </div>
            )}
          </div>

          {/* Painel lateral (só nas views visuais) */}
          {isVisual && (
            <div className="shingo-sidebar">
              <EditPanel
                step={selectedStep}
                onUpdate={p=>selectedId&&updateShingoStep(selectedId,p)}
                onDelete={()=>handleDelete(selectedId)}
                onClose={()=>setSelectedId(null)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shingo-footer">
          <div className="shingo-totals-row">
            {TYPES.map(t=>{
              const count=steps.filter(s=>s.type===t.key).length;
              return count>0?(
                <span key={t.key} className="total-badge" style={{background:t.color}}>
                  <TypeIcon typeKey={t.key} color="#fff" size={13}/> {count}
                </span>
              ):null;
            })}
          </div>
          <span className="footer-stat">Passos: <strong>{steps.length}</strong></span>
          <span className="footer-stat">Tempo: <strong>{fmtSec(totalSec)}</strong></span>
          <span className="footer-stat">VA: <strong>{totalSec>0?Math.round(vaSec/totalSec*100):0}%</strong></span>
          <button type="button" className="shingo-btn-add ml-auto"
            onClick={()=>handleAdd('op')}>
            + Adicionar passo
          </button>
        </div>
      </div>
    </div>
  );
}
