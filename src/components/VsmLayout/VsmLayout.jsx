import React, { useRef, useEffect, useState } from 'react';
import { useVsmStore } from '../../store/useVsmStore.js';
import VsmElements from '../VsmElements/VsmElements.jsx';
import './VsmLayout.css';

function useInfoFlows(wrapperRef, pcpRef, procRefs, processes, zoom) {
  const [flows, setFlows] = useState([]);

  useEffect(() => {
    const draw = () => {
      if (!wrapperRef.current || !pcpRef.current) return;
      // getBoundingClientRect() returns screen-space coords (already scaled by CSS zoom).
      // SVG draws in the wrapper's natural (pre-zoom) coordinate space,
      // so we must divide all offsets by the current zoom factor.
      const z = zoom || 1;
      const wR = wrapperRef.current.getBoundingClientRect();
      const pR = pcpRef.current.getBoundingClientRect();
      const pcpCX = (pR.left - wR.left + pR.width / 2) / z;
      const pcpBY = (pR.bottom - wR.top) / z;

      const next = processes.map((proc) => {
        const el = procRefs.current[proc.id];
        if (!el) return null;
        const cR = el.getBoundingClientRect();
        const cx = (cR.left - wR.left + cR.width / 2) / z;
        const cy = (cR.top - wR.top) / z;
        const fromPcp = (proc.infoFlowDir || 'from-pcp') === 'from-pcp';
        const progLabel = [proc.progType, proc.progFreq].filter(Boolean).join(' · ');
        return {
          id: proc.id, type: proc.infoFlow || 'electronic',
          x1: fromPcp ? pcpCX : cx, y1: fromPcp ? pcpBY : cy,
          x2: fromPcp ? cx : pcpCX, y2: fromPcp ? cy : pcpBY,
          progLabel,
        };
      }).filter(Boolean);
      setFlows(next);
    };

    // rAF garante que o browser pintou o novo layout (incluindo zoom) antes de medir posições
    let raf = requestAnimationFrame(draw);
    const timer = setTimeout(draw, 120);
    window.addEventListener('resize', draw);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); window.removeEventListener('resize', draw); };
  }, [processes, wrapperRef, pcpRef, procRefs, zoom]);

  return flows;
}


export default function VsmLayout({ data, idPrefix = '', readOnly = false, isFuturo: isFuturoProp }) {
  const canvasRef  = useRef(null);
  const wrapperRef = useRef(null);
  const pcpRef     = useRef(null);
  const procRefs   = useRef({});
  const supplierTruckRef = useRef(null);
  const customerTruckRef = useRef(null);
  const wip0Ref    = useRef(null);
  const wipFinalRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [wrapWidth, setWrapWidth] = useState(900);
  const [matFlows, setMatFlows] = useState([]);

  const liveSupplier  = useVsmStore((s) => s.supplier);
  const liveCustomer  = useVsmStore((s) => s.customer);
  const livePcp       = useVsmStore((s) => s.pcp);
  const liveProcesses = useVsmStore((s) => s.processes);
  const liveWips      = useVsmStore((s) => s.wips);
  const liveDemand    = useVsmStore((s) => s.demand);
  const liveAvailable = useVsmStore((s) => s.available);
  const selectedId = useVsmStore((s) => s.selectedId);
  const setSelected = useVsmStore((s) => s.setSelected);
  const updateWip   = useVsmStore((s) => s.updateWip);
  const activeState = useVsmStore((s) => s.activeState);

  const supplier  = data ? data.supplier  : liveSupplier;
  const customer  = data ? data.customer  : liveCustomer;
  const pcp       = data ? data.pcp       : livePcp;
  const processes = data ? data.processes : liveProcesses;
  const wips      = data ? data.wips      : liveWips;
  const demand    = data ? data.demand    : liveDemand;
  const available = data ? data.available : liveAvailable;
  const isFuturo  = isFuturoProp !== undefined ? isFuturoProp : activeState === 'futuro';

  // Auto-zoom: cabe na largura E altura disponíveis, sem overflow; centraliza via margin:auto no wrapper
  useEffect(() => {
    const calcZoom = () => {
      if (!canvasRef.current) return;
      const availW = canvasRef.current.clientWidth  - 32;
      const availH = canvasRef.current.clientHeight - 32;
      const n = processes.length;
      // Largura natural: wip(68)×2 + n×proc(160) + (n-1)×gap(100)
      const centerW = 68 + n * 160 + Math.max(0, n - 1) * 100 + 68;
      const nW = Math.max(centerW + 90, 600); // +90 summary LT/VA; entidades ficam nas bordas do grid
      // Altura natural: top-row(~220) + margin(20) + proc(~140) + info(~90) + timeline(~90)
      const naturalH = 576;
      const z = Math.min(availW / nW, availH / naturalH, 1.5);
      setWrapWidth(nW);
      setZoom(Math.max(0.25, z));
    };
    calcZoom();
    const ro = new ResizeObserver(calcZoom);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [processes.length]);

  const infoFlows = useInfoFlows(wrapperRef, pcpRef, procRefs, processes, zoom);

  // Fluxo de material: caminhão → WIP-0 e WIP-final → caminhão
  useEffect(() => {
    const draw = () => {
      if (!wrapperRef.current) return;
      const z = zoom || 1;
      const wR = wrapperRef.current.getBoundingClientRect();
      const toSvg = (el, xFrac, yEdge) => {
        const r = el.getBoundingClientRect();
        const y = yEdge === 'center'
          ? (r.top + r.bottom) / 2 - wR.top
          : yEdge === 'bottom' ? r.bottom - wR.top : r.top - wR.top;
        return { x: (r.left - wR.left + r.width * xFrac) / z, y: y / z };
      };
      const flows = [];
      if (supplierTruckRef.current && wip0Ref.current) {
        const t = toSvg(supplierTruckRef.current, 0.5, 'bottom');
        const w = toSvg(wip0Ref.current, 0.5, 'top');
        const midY = t.y + (w.y - t.y) * 0.4;
        // L: desce do caminhão → dobra horizontal → desce reto ao topo do WIP
        flows.push({ id: 'mat-l', pts: `${t.x},${t.y + 2} ${t.x},${midY} ${w.x},${midY} ${w.x},${w.y - 2}` });
      }
      if (wipFinalRef.current && customerTruckRef.current) {
        const w = toSvg(wipFinalRef.current, 0.5, 'top');
        const t = toSvg(customerTruckRef.current, 0.5, 'bottom');
        const midY = t.y + (w.y - t.y) * 0.4;
        // L: sobe do WIP → dobra horizontal → sobe reto ao caminhão
        flows.push({ id: 'mat-r', pts: `${w.x},${w.y - 2} ${w.x},${midY} ${t.x},${midY} ${t.x},${t.y + 2}` });
      }
      setMatFlows(flows);
    };
    const raf = requestAnimationFrame(draw);
    const t   = setTimeout(draw, 130);
    window.addEventListener('resize', draw);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); window.removeEventListener('resize', draw); };
  }, [zoom, processes.length]);

  const sel = (id) => (e) => { e.stopPropagation(); setSelected(id); };

  // Arrowhead marker ids — prefixados por instância pra não colidir quando dois VsmLayout renderizam juntos (comparativo)
  const AH_H  = idPrefix + 'vsm-ah-h';
  const AH    = idPrefix + 'vsm-ah';
  const AH_MAT = idPrefix + 'vsm-ah-mat';
  const isSel = (id) => selectedId === id;

  return (
    <div className={`vsm-canvas${isFuturo ? ' vsm-canvas--futuro' : ''}`} ref={canvasRef}
      onClick={readOnly ? undefined : () => setSelected(null)}
      style={readOnly ? { pointerEvents: 'none' } : undefined}>
      <div className="vsm-wrapper" ref={wrapperRef} style={{ zoom, width: wrapWidth }}>
        {isFuturo && <div className="vsm-futuro-watermark" aria-hidden="true">FUTURO</div>}

        {/* ── SVG overlay: PCP info flows + material flows ── */}
        <svg className="vsm-arrow-svg" aria-hidden="true">
          <defs>
            <marker id={AH} markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
              <polygon points="0 0, 6 2.5, 0 5" fill="var(--black)" />
            </marker>
            <marker id={AH_MAT} markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto">
              <polygon points="0 0, 5 2, 0 4" fill="var(--black)" />
            </marker>
          </defs>
          {/* Material flow: fornecedor→WIP-0 e WIP-final→cliente */}
          {matFlows.map(f => (
            <polyline key={f.id} points={f.pts}
              fill="none" stroke="var(--black)" strokeWidth="1.5" strokeLinejoin="round"
              markerEnd={`url(#${AH_MAT})`} />
          ))}
          {infoFlows.map((flow) => {
            const { x1, y1, x2, y2, type, progLabel } = flow;
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;

            if (type === 'manual') {
              return (
                <g key={flow.id}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="var(--black)" strokeWidth="1" markerEnd={`url(#${AH})`}/>
                  {progLabel && <InfoFlowLabel x={mx} y={my} text={progLabel}/>}
                </g>
              );
            }

            const dx = x2 - x1, dy = y2 - y1;
            const len = Math.sqrt(dx*dx + dy*dy) || 1;
            const nx = -dy/len, ny = dx/len;
            const K = 8;
            const k1x = x1 + dx*0.52 + nx*K, k1y = y1 + dy*0.52 + ny*K;
            const k2x = x1 + dx*0.44 - nx*K, k2y = y1 + dy*0.44 - ny*K;

            return (
              <g key={flow.id}>
                <polyline fill="none" stroke="var(--black)" strokeWidth="1"
                  markerEnd={`url(#${AH})`}
                  points={`${x1},${y1} ${k1x},${k1y} ${k2x},${k2y} ${x2},${y2}`}/>
                {progLabel && <InfoFlowLabel x={mx} y={my} text={progLabel}/>}
              </g>
            );
          })}
        </svg>

        {/* ── TOP ROW ── */}
        <div className="vsm-top-row">

          {/* Supplier side */}
          <div data-tour="supplier" className="vsm-entity-side">
            <FactoryBox name={supplier.name} isSelected={isSel('supplier')} onClick={sel('supplier')} />
            <div className="vsm-supply-card">
              <div className="vsm-supply-title">{supplier.product || 'PRODUTO'}</div>
              {(supplier.leadTime || supplier.freqEntrega) ? (
                <div className="vsm-supply-detail">
                  {supplier.leadTime && <span>LT: {supplier.leadTime}</span>}
                  {supplier.freqEntrega && <span>Freq: {supplier.freqEntrega}</span>}
                </div>
              ) : (
                <div className="vsm-supply-lines"><div /><div /><div /></div>
              )}
            </div>
            <div className="vsm-entity-transport" ref={supplierTruckRef}>
              <span className="vsm-truck-icon">🚚</span>
            </div>
          </div>

          {/* PCP / MRP */}
          <div data-tour="pcp" className="vsm-pcp-center">
            <div className="vsm-pedidos-row">
              <span className="vsm-pedidos-label">pedidos</span>
              <HorizArrow type={supplier.infoFlow || 'manual'} dir="left" markerId={AH_H + '-l'}
                reversed={(supplier.infoFlowDir || 'from-pcp') === 'to-pcp'}
                label={[supplier.tipoPedido, supplier.freqEntrega].filter(Boolean).join(' · ')} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div className={`vsm-pcp-box ${isSel('pcp') ? 'vsm-selected' : ''}`}
                  ref={pcpRef} onClick={sel('pcp')}>
                  <div className="vsm-pcp-main">PCP<br />MRP</div>
                </div>
                {pcp.sistema && <div className="vsm-pcp-sub">{pcp.sistema}</div>}
              </div>
              <HorizArrow type={customer.infoFlow || 'manual'} dir="right" markerId={AH_H + '-r'}
                reversed={(customer.infoFlowDir || 'from-pcp') === 'to-pcp'}
                label={[customer.freqPedidos, customer.prazoEntrega].filter(Boolean).join(' · ')} />
              <span className="vsm-pedidos-label">pedidos</span>
            </div>
          </div>

          {/* Customer side */}
          <div data-tour="customer" className="vsm-entity-side vsm-entity-right">
            <FactoryBox name={customer.name} isSelected={isSel('customer')} onClick={sel('customer')} />
            <div className="vsm-demand-card">
              <div className="vsm-demand-icon">
                <div className="vsm-person-head" />
                <div className="vsm-person-body" />
              </div>
              <div className="vsm-demand-data">
                <div className="vsm-demand-row"><span>Demanda</span><span>{demand} pç/dia</span></div>
                <div className="vsm-demand-row"><span>Disp.</span><span>{available} min</span></div>
                {customer.freqPedidos  && <div className="vsm-demand-row"><span>Freq.</span><span>{customer.freqPedidos}</span></div>}
                {customer.prazoEntrega && <div className="vsm-demand-row"><span>Prazo</span><span>{customer.prazoEntrega}</span></div>}
              </div>
            </div>
            <div className="vsm-entity-transport vsm-transport-right" ref={customerTruckRef}>
              <span className="vsm-truck-icon">🚚</span>
            </div>
          </div>

        </div>{/* end top-row */}

        {/* ── CENTER WRAP: grid onde cada coluna = wip | proc | gap ── */}
        <CenterGrid
          processes={processes} wips={wips} procRefs={procRefs}
          isSel={isSel} sel={sel} updateWip={updateWip}
          wip0Ref={wip0Ref} wipFinalRef={wipFinalRef}
          isFuturo={isFuturo} demand={demand} available={available}
          idPrefix={idPrefix}
        />
        <VsmElements zoom={zoom} elements={data ? data.elements : undefined} readOnly={readOnly} idPrefix={idPrefix} />
      </div>{/* end wrapper */}
    </div>
  );
}

// Ícone de fábrica VSM: 3 chaminés + corpo retangular, outline puro
function FactoryBox({ name, isSelected, onClick }) {
  const W = 116, H = 58;
  const chimneys = [
    { x: 16, y: 2, w: 22, h: 22 },
    { x: 47, y: 6, w: 22, h: 18 },
    { x: 78, y: 3, w: 22, h: 21 },
  ];
  const bodyY = 24;
  return (
    <svg
      className={`vsm-factory-svg${isSelected ? ' vsm-selected' : ''}`}
      onClick={onClick}
      viewBox={`0 0 ${W} ${H}`}
      width={W} height={H}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {chimneys.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} />
      ))}
      <rect x="1" y={bodyY} width={W - 2} height={H - bodyY - 1} />
      <text
        x={W / 2} y={bodyY + (H - bodyY) / 2 + 4}
        textAnchor="middle"
        fontSize="12"
        fontWeight="800"
        fontFamily="system-ui, sans-serif"
        letterSpacing="1"
        fill="currentColor"
        stroke="none"
      >
        {name}
      </text>
    </svg>
  );
}

// Etiqueta sobre seta de informação
function InfoFlowLabel({ x, y, text }) {
  const W = Math.max(text.length * 6, 40), H = 15;
  return (
    <g>
      <rect x={x - W/2} y={y - H/2} width={W} height={H} rx="4"
        fill="white" stroke="#94a3b8" strokeWidth="1"/>
      <text x={x} y={y + 4.5} textAnchor="middle" fontSize="9"
        fill="#1e40af" fontWeight="700" fontFamily="system-ui, sans-serif">{text}</text>
    </g>
  );
}

// Seta horizontal manual ou eletrônica (pedidos Fornecedor ↔ PCP ↔ Cliente)
function HorizArrow({ type, dir, markerId, reversed, label }) {
  const isLeft = dir === 'left';
  const goLeft = reversed ? !isLeft : isLeft;
  const startX = goLeft ? 200 : 0;
  const endX   = goLeft ? 0   : 200;
  const x1 = startX, y1 = 10, x2 = endX, y2 = 10;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx*dx + dy*dy) || 1;
  const nx = -dy/len, ny = dx/len;
  const K = 8;
  const k1x = x1 + dx*0.52 + nx*K, k1y = y1 + dy*0.52 + ny*K;
  const k2x = x1 + dx*0.44 - nx*K, k2y = y1 + dy*0.44 - ny*K;

  return (
    <svg className="vsm-pedidos-svg" viewBox="0 -5 200 30" preserveAspectRatio="none" overflow="visible" aria-hidden="true">
      <defs>
        <marker id={markerId} markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
          <polygon points="0 0,8 3,0 6" fill="var(--black)" />
        </marker>
      </defs>
      {type === 'manual' ? (
        <line x1={startX} y1="10" x2={endX} y2="10"
          stroke="var(--black)" strokeWidth="2" markerEnd={`url(#${markerId})`} />
      ) : (
        <polyline points={`${x1},${y1} ${k1x},${k1y} ${k2x},${k2y} ${x2},${y2}`} fill="none"
          stroke="var(--black)" strokeWidth="2" strokeLinejoin="miter" markerEnd={`url(#${markerId})`} />
      )}
    </svg>
  );
}

function WipNode({ wip, isSel, sel, updateWip, style, nodeRef, showArrow, tourId, idPrefix = '' }) {
  const type = wip.flowType || 'push';
  const selected = isSel(`wip-${wip.id}`);
  const tourAttr = tourId ? { 'data-tour': tourId } : {};
  const mat = wip.material ? <div className="vsm-wip-material">{wip.material}</div> : null;
  const qty = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <input className="vsm-stock-inp" type="number" value={wip.qty} min="0"
        onClick={e => e.stopPropagation()} onChange={e => updateWip(wip.id, { qty: e.target.value })} />
      <span className="vsm-stock-unit">{wip.unit}</span>
    </div>
  );

  if (type === 'supermercado') {
    return (
      <div ref={nodeRef} className={`vsm-gap-proc ${selected ? 'vsm-selected' : ''}`}
        style={style} {...tourAttr} onClick={sel(`wip-${wip.id}`)}>
        {mat}
        {showArrow && (
          <svg className="vsm-connector-svg" viewBox="0 0 36 24" width="36" height="24">
            <defs><marker id={`${idPrefix}ah-pull-${wip.id}`} markerWidth="6" markerHeight="5" refX="1" refY="2.5" orient="auto">
              <polygon points="6 0,0 2.5,6 5" fill="#2563eb"/>
            </marker></defs>
            <line x1="34" y1="12" x2="4" y2="12" stroke="#2563eb" strokeWidth="2" markerEnd={`url(#${idPrefix}ah-pull-${wip.id})`}/>
          </svg>
        )}
        <div className="vsm-supermercado">
          <svg viewBox="0 0 52 40" width="52" height="40">
            <rect x="2" y="2" width="48" height="36" rx="2" fill="#fff" stroke="#333" strokeWidth="2"/>
            <line x1="2" y1="15" x2="50" y2="15" stroke="#333" strokeWidth="1.5"/>
            <line x1="2" y1="28" x2="50" y2="28" stroke="#333" strokeWidth="1.5"/>
            <line x1="18" y1="2" x2="18" y2="38" stroke="#333" strokeWidth="1.5"/>
            <line x1="34" y1="2" x2="34" y2="38" stroke="#333" strokeWidth="1.5"/>
          </svg>
          <div style={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center' }}>{qty}</div>
        </div>
      </div>
    );
  }

  if (type === 'fifo') {
    return (
      <div ref={nodeRef} className={`vsm-gap-proc ${selected ? 'vsm-selected' : ''}`}
        style={{ ...style, justifyContent: 'center' }} {...tourAttr} onClick={sel(`wip-${wip.id}`)}>
        {mat}
        <div className="vsm-fifo-lane">
          <svg viewBox="0 0 80 30" width="80" height="30">
            <defs><marker id={`${idPrefix}ah-fifo-${wip.id}`} markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
              <polygon points="0 0,6 2.5,0 5" fill="#2563eb"/>
            </marker></defs>
            <rect x="1" y="1" width="78" height="28" rx="4" fill="#e8f4ff" stroke="#2563eb" strokeWidth="2"/>
            <text x="28" y="14" fontFamily="monospace" fontWeight="800" fontSize="10" fill="#2563eb">FIFO</text>
            <line x1="10" y1="22" x2="66" y2="22" stroke="#2563eb" strokeWidth="1.5" markerEnd={`url(#${idPrefix}ah-fifo-${wip.id})`}/>
          </svg>
          <div style={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{qty}</div>
        </div>
      </div>
    );
  }

  if (type === 'kanban') {
    return (
      <div ref={nodeRef} className={`vsm-gap-proc ${selected ? 'vsm-selected' : ''}`}
        style={style} {...tourAttr} onClick={sel(`wip-${wip.id}`)}>
        {mat}
        {showArrow && (
          <svg className="vsm-connector-svg" viewBox="0 0 36 24" width="36" height="24">
            <defs><marker id={`${idPrefix}ah-kb-${wip.id}`} markerWidth="6" markerHeight="5" refX="1" refY="2.5" orient="auto">
              <polygon points="6 0,0 2.5,6 5" fill="#d97706"/>
            </marker></defs>
            <line x1="34" y1="12" x2="4" y2="12" stroke="#d97706" strokeWidth="2" strokeDasharray="5,3" markerEnd={`url(#${idPrefix}ah-kb-${wip.id})`}/>
          </svg>
        )}
        <div className="vsm-kanban-node">
          <svg viewBox="0 0 44 34" width="44" height="34">
            <rect x="2" y="2" width="40" height="24" rx="3" fill="#fef3c7" stroke="#d97706" strokeWidth="2"/>
            <line x1="8" y1="10" x2="36" y2="10" stroke="#d97706" strokeWidth="1.5"/>
            <line x1="8" y1="17" x2="28" y2="17" stroke="#d97706" strokeWidth="1.5"/>
            <polygon points="22,26 14,34 30,34" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5"/>
          </svg>
          <div style={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center' }}>{qty}</div>
        </div>
      </div>
    );
  }

  // push (default)
  return (
    <div ref={nodeRef} className={`vsm-gap-proc ${selected ? 'vsm-selected' : ''}`}
      style={style} {...tourAttr} onClick={sel(`wip-${wip.id}`)}>
      {mat}
      {showArrow && (
        <div className="vsm-push-arrow"><div className="vsm-push-line" /></div>
      )}
      <div className="vsm-tri-wrap">
        <div className="vsm-tri"><span className="vsm-tri-i">I</span></div>
        {qty}
      </div>
    </div>
  );
}

function KaizenBurst() {
  const pts = Array.from({ length: 20 }, (_, i) => {
    const a = (i * Math.PI) / 10 - Math.PI / 2;
    const r = i % 2 === 0 ? 48 : 34;
    return `${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`;
  }).join(' ');
  return (
    <svg className="vsm-kaizen-auto" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polygon points={pts} fill="rgba(249,115,22,0.18)" stroke="rgba(234,88,12,0.45)" strokeWidth="1.5" />
      <text x="50" y="56" textAnchor="middle" fontSize="14" fontWeight="900"
        fill="rgba(180,60,0,0.55)" fontFamily="system-ui" letterSpacing="1">KAIZEN</text>
    </svg>
  );
}

function CenterGrid({ processes, wips, procRefs, isSel, sel, updateWip, wip0Ref, wipFinalRef, isFuturo, demand, available, idPrefix = '' }) {
  const takt  = demand > 0 ? available / demand : 1;

  const ctToMin = (p) => {
    const v = parseFloat(String(p.ct).replace(',', '.')) || 0;
    if (p.ctUnit === 'Seg') return v / 60;
    if (p.ctUnit === 'H')   return v * 60;
    return v;
  };
  const parsePct = (s) => Math.min(100, Math.max(0, parseFloat(String(s).replace('%', '').replace(',', '.')) || 0)) / 100;
  const calcOee  = (p) => parsePct(p.uptime) * parsePct(p.performance || '100%') * parsePct(p.quality || '100%');

  const tcsMin = processes.map(ctToMin);
  const procAvail    = (p) => available * (parseInt(p.turnos) || 1);
  const ctEfetivoMin = (p) => ctToMin(p) / (calcOee(p) || 1);
  const taktProc     = (p) => demand > 0 ? procAvail(p) / demand : Infinity;
  const isBottleneck = (p) => taktProc(p) > 0 && ctEfetivoMin(p) > taktProc(p);
  const wipWaitMin = (w) => {
    const qty = parseFloat(w.qty) || 0;
    const cd  = parseFloat(w.consumoDiario);
    if (cd > 0) return (qty / cd) * available; // dias de cobertura × disponível (min/dia)
    return qty * (parseFloat(w.factor) || 1) * takt;
  };
  const waits = wips.slice(0, processes.length + 1).map(wipWaitMin);
  const fmt    = (v) => v > 0 ? (v >= 60 ? (v / 60).toFixed(1) + 'h' : Math.round(v) + 'm') : '—';

  // Altura das barras de espera: proporcional ao tempo de espera (alto = muito estoque)
  const maxWait = Math.max(...waits, 1);
  const MAX_WAIT_H = 72;
  const PROC_BAR_H = 18;
  const scaleWait = (v) => v > 0 ? Math.max(PROC_BAR_H + 8, Math.round((v / maxWait) * MAX_WAIT_H)) : PROC_BAR_H + 8;
  // fmtMin: entrada em minutos → seg se < 60min, horas se >= 60min
  const fmtMin = (v) => {
    if (!v || v <= 0) return '—';
    if (v >= 60) return (v / 60).toFixed(1) + 'h';
    return (v * 60).toFixed(0) + 's';
  };
  const fmtTC  = (p) => {
    const v = parseFloat(String(p.ct).replace(',', '.')) || 0;
    if (!v) return '—';
    if (p.ctUnit === 'Min') return (v * 60) + 's';
    if (p.ctUnit === 'H')   return (v * 3600) + 's';
    return v + 's';
  };

  const totalVA = tcsMin.reduce((a, b) => a + b, 0);
  const totalLT = totalVA + waits.reduce((a, b) => a + b, 0);

  // Colunas: wip(68) proc(160) [gap(100) proc(160)]×(n-1) wip(68) + coluna summary
  const WIP_W = '68px', PROC_W = '160px', GAP_W = '100px';
  const cols = [WIP_W, ...processes.flatMap((_, i) =>
    i < processes.length - 1 ? [PROC_W, GAP_W] : [PROC_W]
  ), WIP_W, 'auto'].join(' ');

  const procCol     = (i) => 2 + i * 2;
  const gapCol      = (i) => 3 + i * 2;
  const finalWipCol = 2 * processes.length + 1;
  const summaryCol  = finalWipCol + 1;

  const g = (row, col) => ({ gridRow: row, gridColumn: col });

  return (
    <div className="vsm-center-wrap" style={{ gridTemplateColumns: cols }}>

      {/* ── ROW 1: nível dos processos ── */}
      {/* WIP-0 */}
      {wips[0] && (
        <WipNode
          wip={wips[0]} isSel={isSel} sel={sel} updateWip={updateWip}
          style={g(1, 1)} nodeRef={wip0Ref} showArrow={false} tourId="wip-first"
          idPrefix={idPrefix}
        />
      )}

      {processes.map((proc, i) => {
        const nextWip = wips[i + 1];
        return (
          <React.Fragment key={proc.id}>
            {/* Proc card */}
            <div className="vsm-proc-wrap" style={g(1, procCol(i))} {...(i === 0 ? { 'data-tour': 'proc-first' } : {})}>
              <div className={`vsm-proc-card ${isSel(`proc-${proc.id}`) ? 'vsm-selected' : ''} ${isBottleneck(proc) ? 'vsm-bottleneck' : ''}`}
                ref={el => { procRefs.current[proc.id] = el; }}
                onClick={sel(`proc-${proc.id}`)}>
                <div className="vsm-proc-name">
                  {proc.name}
                  {isBottleneck(proc) && <span className="vsm-bottleneck-badge">⚠ GARGALO</span>}
                  {proc.pacemaker && <span className="vsm-pacemaker-badge">⬡ PACEMAKER</span>}
                </div>
                <div className="vsm-proc-body">
                  <div className="vsm-gear"><div className="vsm-gear-inner" /></div>
                  <div className="vsm-proc-fields">
                    <div className="vsm-pf">
                      <span>TC</span>
                      <span>
                        {fmtTC(proc)}
                        {calcOee(proc) < 1 && (
                          <span className="vsm-tc-efetivo"> →{Math.round(ctEfetivoMin(proc) * 60)}s</span>
                        )}
                      </span>
                    </div>
                    <div className="vsm-pf"><span>Ops</span><span>{proc.ops}</span></div>
                    <div className="vsm-pf"><span>Turnos</span><span>{proc.turnos || 1}T</span></div>
                    <div className="vsm-pf">
                      <span>OEE</span>
                      <span className={`vsm-oee-val${calcOee(proc) < 0.65 ? ' vsm-oee-low' : calcOee(proc) < 0.85 ? ' vsm-oee-mid' : ' vsm-oee-ok'}`}>
                        {Math.round(calcOee(proc) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {isFuturo && proc.kaizen && <KaizenBurst />}
            </div>

            {/* Gap: conector + WIP-next */}
            {i < processes.length - 1 && nextWip && (
              <WipNode
                wip={nextWip} isSel={isSel} sel={sel} updateWip={updateWip}
                style={g(1, gapCol(i))} showArrow
                idPrefix={idPrefix}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* WIP-final */}
      {wips[processes.length] && (
        <WipNode
          wip={wips[processes.length]} isSel={isSel} sel={sel} updateWip={updateWip}
          style={g(1, finalWipCol)} nodeRef={wipFinalRef} showArrow={false}
          idPrefix={idPrefix}
        />
      )}

      {/* ── ROW 2: info cards ── */}
      {processes.map((proc, i) => {
        const hasProg = proc.progType || proc.progFreq || proc.progSistema;
        return (
          <div key={`info-${proc.id}`}
            className={`vsm-info-card ${isSel(`proc-${proc.id}`) ? 'vsm-selected' : ''}`}
            style={g(2, procCol(i))}
            onClick={sel(`proc-${proc.id}`)}>
            <div className="vsm-info-card-top">INFO</div>
            {hasProg && (
              <div className="vsm-info-prog">
                {proc.progType    && <span className="vsm-prog-type">{proc.progType}</span>}
                {proc.progFreq    && <span className="vsm-prog-freq">{proc.progFreq}</span>}
                {proc.progSistema && <span className="vsm-prog-sis">{proc.progSistema}</span>}
              </div>
            )}
            {proc.info
              ? <div className="vsm-info-text">{proc.info}</div>
              : !hasProg && <div className="vsm-info-lines"><div /><div /><div /></div>
            }
          </div>
        );
      })}

      {/* ── ROW 4: timeline alinhado com colunas do grid ── */}
      {(() => {
        const n  = processes.length;
        const W0 = 68, PW = 160, GW = 100; // larguras reais das colunas
        const BL = 60, VA = 10;            // baseline e altura VA em px

        // x positions de cada segmento (em px, alinhados com o grid)
        const segs = [];
        let x = 0;
        for (let i = 0; i <= n; i++) {
          const w = (i === 0 || i === n) ? W0 : GW;
          segs.push({ type: 'wait', x, w, idx: i });
          x += w;
          if (i < n) {
            segs.push({ type: 'proc', x, w: PW, idx: i });
            x += PW;
          }
        }
        const totalW = x;
        const WAIT_H = BL - VA;

        // polyline points
        const pts = [`0,${BL}`, `0,${VA}`];
        for (const seg of segs) {
          const y = seg.type === 'wait' ? VA : BL - VA;
          pts.push(`${seg.x},${y}`, `${seg.x + seg.w},${y}`);
        }
        pts.push(`${totalW},${BL}`);

        return (
          <div key="tl-wrap" data-tour="timeline" style={{ gridRow: 3, gridColumn: `1 / ${finalWipCol + 1}`, position: 'relative' }}>
            <svg style={{ display: 'block', width: '100%', height: BL + 4, overflow: 'visible' }}
              viewBox={`0 -6 ${totalW} ${BL + 10}`} preserveAspectRatio="none">
              <polyline points={pts.join(' ')} fill="none" stroke="#333" strokeWidth="1.5" strokeLinejoin="miter"/>
            </svg>
            {/* labels posicionados sobre cada segmento — left em % para escalar com o SVG */}
            {segs.map((seg) => (
              <span key={`${seg.type}-${seg.idx}`} style={{
                position: 'absolute',
                left: `${(seg.x + seg.w / 2) / totalW * 100}%`,
                transform: 'translateX(-50%)',
                ...(seg.type === 'wait'
                  ? { bottom: BL + 6, fontSize: 13, color: '#555', whiteSpace: 'nowrap', fontWeight: 600 }
                  : { top: BL + 8, fontSize: 13, color: '#e33', fontWeight: 700, whiteSpace: 'nowrap' }),
              }}>
                {seg.type === 'wait' ? fmt(waits[seg.idx] || 0) : fmtTC(processes[seg.idx])}
              </span>
            ))}
          </div>
        );
      })()}

      {/* ── LT / VA summary ── */}
      <div className="vsm-tl-summary" style={{ gridRow: '3 / 5', gridColumn: summaryCol }}>
        <span className="vsm-tl-lt">LT={fmtMin(totalLT)}</span>
        <span className="vsm-tl-va">VA={fmtMin(totalVA)}</span>
      </div>

    </div>
  );
}
