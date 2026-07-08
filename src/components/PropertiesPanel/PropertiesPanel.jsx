import { useVsmStore } from '../../store/useVsmStore.js';
import './PropertiesPanel.css';

function Field({ label, value, onChange }) {
  return (
    <div className="properties-field">
      <label>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="properties-field">
      <label>{label}</label>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}
        style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--gray-200)', background: 'var(--gray-100)', fontSize: 13 }}>
        <option value="">—</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function PropsSection({ title }) {
  return <div className="props-section-sep">{title}</div>;
}

function InfoFlowBtns({ value, onChange }) {
  const flow = value || 'manual';
  return (
    <div className="properties-field">
      <label>Fluxo de Informação (PCP)</label>
      <div className="info-flow-btns">
        <button type="button"
          className={`info-flow-btn ${flow === 'manual' ? 'active' : ''}`}
          onClick={() => onChange('manual')}>
          <svg width="48" height="16" aria-hidden="true">
            <defs><marker id="ah-s-m" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto"><polygon points="0 0,6 2.5,0 5" fill="currentColor"/></marker></defs>
            <line x1="2" y1="8" x2="38" y2="8" stroke="currentColor" strokeWidth="2" markerEnd="url(#ah-s-m)"/>
          </svg>
          Manual
        </button>
        <button type="button"
          className={`info-flow-btn ${flow === 'electronic' ? 'active' : ''}`}
          onClick={() => onChange('electronic')}>
          <svg width="48" height="16" aria-hidden="true">
            <defs><marker id="ah-s-e" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto"><polygon points="0 0,6 2.5,0 5" fill="currentColor"/></marker></defs>
            <polyline points="2,8 14,8 14,4 34,12 34,8 46,8" fill="none" stroke="currentColor" strokeWidth="2" markerEnd="url(#ah-s-e)"/>
          </svg>
          Eletrônica
        </button>
      </div>
    </div>
  );
}

function DirBtns({ value, onChange, labelA = 'PCP → Ent', labelB = 'Ent → PCP' }) {
  const dir = value || 'from-pcp';
  return (
    <div className="properties-field">
      <label>Direção</label>
      <div className="info-flow-btns">
        <button type="button" className={`info-flow-btn${dir === 'from-pcp' ? ' active' : ''}`}
          onClick={() => onChange('from-pcp')}>{labelA}</button>
        <button type="button" className={`info-flow-btn${dir === 'to-pcp' ? ' active' : ''}`}
          onClick={() => onChange('to-pcp')}>{labelB}</button>
      </div>
    </div>
  );
}

function SupplierProps() {
  const supplier = useVsmStore((s) => s.supplier);
  const update   = useVsmStore((s) => s.updateSupplier);
  return (
    <div className="properties-group">
      <Field label="Nome"    value={supplier.name}    onChange={(v) => update({ name: v })} />
      <Field label="Produto" value={supplier.product} onChange={(v) => update({ product: v })} />
      <InfoFlowBtns value={supplier.infoFlow} onChange={(v) => update({ infoFlow: v })} />
      <DirBtns value={supplier.infoFlowDir} onChange={(v) => update({ infoFlowDir: v })}
        labelA="PCP → Forn" labelB="Forn → PCP" />
      <PropsSection title="Fornecimento" />
      <Field label="Lead Time" value={supplier.leadTime || ''} onChange={(v) => update({ leadTime: v })} />
      <Field label="Freq. de entrega" value={supplier.freqEntrega || ''} onChange={(v) => update({ freqEntrega: v })} />
      <SelectField label="Tipo de pedido" value={supplier.tipoPedido} onChange={(v) => update({ tipoPedido: v })}
        options={['PO','Kanban','Forecast','MRP','Manual']} />
    </div>
  );
}

function CustomerProps() {
  const customer = useVsmStore((s) => s.customer);
  const update   = useVsmStore((s) => s.updateCustomer);
  return (
    <div className="properties-group">
      <Field label="Nome" value={customer.name} onChange={(v) => update({ name: v })} />
      <InfoFlowBtns value={customer.infoFlow} onChange={(v) => update({ infoFlow: v })} />
      <DirBtns value={customer.infoFlowDir} onChange={(v) => update({ infoFlowDir: v })}
        labelA="PCP → Cli" labelB="Cli → PCP" />
      <PropsSection title="Demanda" />
      <Field label="Freq. de pedidos" value={customer.freqPedidos || ''} onChange={(v) => update({ freqPedidos: v })} />
      <Field label="Prazo de entrega (OTIF)" value={customer.prazoEntrega || ''} onChange={(v) => update({ prazoEntrega: v })} />
    </div>
  );
}

function PcpProps() {
  const pcp    = useVsmStore((s) => s.pcp);
  const update = useVsmStore((s) => s.updatePcp);
  return (
    <div className="properties-group">
      <Field label="Nome" value={pcp.name} onChange={(v) => update({ name: v })} />
      <PropsSection title="Planejamento" />
      <SelectField label="Sistema" value={pcp.sistema} onChange={(v) => update({ sistema: v })}
        options={['MRP','ERP','Kanban','Heijunka','Excel','Manual','SAP','TOTVS']} />
      <Field label="Horizonte" value={pcp.horizonte || ''} onChange={(v) => update({ horizonte: v })} />
      <SelectField label="Freq. de ordens" value={pcp.freqOrdens} onChange={(v) => update({ freqOrdens: v })}
        options={['Diária','Semanal','Quinzenal','Mensal','Por demanda']} />
    </div>
  );
}

function ProcessProps({ id }) {
  const proc        = useVsmStore((s) => s.processes.find((p) => p.id === id));
  const update      = useVsmStore((s) => s.updateProcess);
  const removeProcess = useVsmStore((s) => s.removeProcess);
  const setPacemaker  = useVsmStore((s) => s.setPacemaker);
  const addAcao       = useVsmStore((s) => s.addAcao);
  const updateAcao    = useVsmStore((s) => s.updateAcao);
  const removeAcao    = useVsmStore((s) => s.removeAcao);
  const activeState = useVsmStore((s) => s.activeState);
  if (!proc) return null;
  const upd = (patch) => update(id, patch);
  return (
    <div className="properties-group">
      <Field label="Nome"   value={proc.name}   onChange={(v) => upd({ name: v })} />
      <div className="properties-field">
        <label>Tempo de Ciclo</label>
        <div className="properties-field-row" style={{ gap: 6 }}>
          <input value={proc.ct} onChange={(e) => upd({ ct: e.target.value })}
            style={{ flex: 1 }} />
          {['Seg', 'Min', 'H'].map((u) => (
            <button key={u} type="button"
              className={`info-flow-btn${(proc.ctUnit || 'Seg') === u ? ' active' : ''}`}
              style={{ flex: 'none', padding: '6px 8px', fontSize: 11 }}
              onClick={() => upd({ ctUnit: u })}>
              {u}
            </button>
          ))}
        </div>
      </div>
      <Field label="Setup"       value={proc.setup}       onChange={(v) => upd({ setup: v })} />
      <Field label="Ops"         value={proc.ops}         onChange={(v) => upd({ ops: v })} />
      <div className="properties-field">
        <label>Turnos</label>
        <div className="info-flow-btns">
          {['1','2','3'].map(t => (
            <button key={t} type="button"
              className={`info-flow-btn${(proc.turnos || '1') === t ? ' active' : ''}`}
              onClick={() => upd({ turnos: t })}>
              {t}T
            </button>
          ))}
        </div>
      </div>
      <div data-tour="props-oee" className="props-tour-section">
        <Field label="Disponib. %" value={proc.uptime}      onChange={(v) => upd({ uptime: v })} />
        <Field label="Desempenho %" value={proc.performance || '100%'} onChange={(v) => upd({ performance: v })} />
        <Field label="Qualidade %"  value={proc.quality     || '100%'} onChange={(v) => upd({ quality: v })} />
      </div>
      <PropsSection title="Programação" />
      <div data-tour="props-prog" className="props-tour-section">
        <SelectField label="Como é programado" value={proc.progType} onChange={(v) => upd({ progType: v })}
          options={['MRP','Kanban','FIFO','Heijunka','Verbal','Manual','Por demanda']} />
        <SelectField label="Frequência" value={proc.progFreq} onChange={(v) => upd({ progFreq: v })}
          options={['Diária','Semanal','Quinzenal','Mensal','Por demanda','Contínua']} />
        <Field label="Sistema" value={proc.progSistema || ''} onChange={(v) => upd({ progSistema: v })} />
      </div>
      <PropsSection title="Observações" />
      <div className="properties-field">
        <label>Info</label>
        <textarea
          value={proc.info}
          rows={3}
          onChange={(e) => upd({ info: e.target.value })}
          style={{ resize: 'vertical', padding: '8px 10px', borderRadius: 8,
            border: '1px solid var(--gray-200)', background: 'var(--gray-100)',
            font: 'inherit', fontSize: 13 }}
        />
      </div>
      <div className="properties-field">
        <label>Direção Info (PCP)</label>
        <div className="info-flow-btns">
          <button type="button"
            className={`info-flow-btn${(proc.infoFlowDir || 'from-pcp') === 'from-pcp' ? ' active' : ''}`}
            onClick={() => upd({ infoFlowDir: 'from-pcp' })}>
            PCP → Proc
          </button>
          <button type="button"
            className={`info-flow-btn${(proc.infoFlowDir || 'from-pcp') === 'to-pcp' ? ' active' : ''}`}
            onClick={() => upd({ infoFlowDir: 'to-pcp' })}>
            Proc → PCP
          </button>
        </div>
      </div>
      <div className="properties-field">
        <label>Tipo Info (PCP)</label>
        <div className="info-flow-btns">
          <button
            type="button"
            className={`info-flow-btn ${(proc.infoFlow || 'electronic') === 'manual' ? 'active' : ''}`}
            onClick={() => upd({ infoFlow: 'manual' })}
          >
            <svg width="48" height="16" aria-hidden="true">
              <line x1="2" y1="8" x2="38" y2="8" stroke="currentColor" strokeWidth="2" markerEnd="url(#ah-preview)" />
              <defs>
                <marker id="ah-preview" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
                  <polygon points="0 0, 6 2.5, 0 5" fill="currentColor" />
                </marker>
              </defs>
            </svg>
            Manual
          </button>
          <button
            type="button"
            className={`info-flow-btn ${(proc.infoFlow || 'electronic') === 'electronic' ? 'active' : ''}`}
            onClick={() => upd({ infoFlow: 'electronic' })}
          >
            <svg width="48" height="16" aria-hidden="true">
              <line x1="2" y1="8" x2="38" y2="8" stroke="currentColor" strokeWidth="2" markerEnd="url(#ah-preview2)" />
              <polygon points="25,-1 21,8 23.5,8 20,17" fill="currentColor" />
              <defs>
                <marker id="ah-preview2" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
                  <polygon points="0 0, 6 2.5, 0 5" fill="currentColor" />
                </marker>
              </defs>
            </svg>
            Eletrônica
          </button>
        </div>
      </div>
      <div className="properties-field">
        <label>Direção do Fluxo</label>
        <div className="info-flow-btns">
          <button type="button"
            className={`info-flow-btn${(proc.pushDir || 'push') === 'push' ? ' active' : ''}`}
            onClick={() => upd({ pushDir: 'push' })}>
            <svg width="48" height="16" aria-hidden="true">
              <defs><marker id="ah-push" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto"><polygon points="0 0,6 2.5,0 5" fill="currentColor"/></marker></defs>
              <line x1="2" y1="8" x2="42" y2="8" stroke="currentColor" strokeWidth="2" markerEnd="url(#ah-push)"/>
            </svg>
            Push →
          </button>
          <button type="button"
            className={`info-flow-btn${(proc.pushDir || 'push') === 'pull' ? ' active' : ''}`}
            onClick={() => upd({ pushDir: 'pull' })}>
            <svg width="48" height="16" aria-hidden="true">
              <defs><marker id="ah-pull" markerWidth="6" markerHeight="5" refX="1" refY="2.5" orient="auto"><polygon points="6 0,0 2.5,6 5" fill="currentColor"/></marker></defs>
              <line x1="6" y1="8" x2="46" y2="8" stroke="currentColor" strokeWidth="2" markerEnd="url(#ah-pull)"/>
            </svg>
            ← Pull
          </button>
        </div>
      </div>
      <button type="button"
        className={`info-flow-btn${proc.pacemaker ? ' active' : ''}`}
        style={{ justifyContent: 'center', fontWeight: 700, borderColor: '#7c3aed', color: proc.pacemaker ? '#fff' : '#7c3aed', background: proc.pacemaker ? '#7c3aed' : undefined }}
        onClick={() => setPacemaker(id)}>
        ⬡ {proc.pacemaker ? 'Pacemaker ativo' : 'Definir como Pacemaker'}
      </button>

      {activeState === 'futuro' && (
        <>
          <button type="button"
            className={`info-flow-btn${proc.kaizen ? ' active' : ''}`}
            style={{ justifyContent: 'center', fontWeight: 700, background: proc.kaizen ? '#f97316' : undefined, borderColor: '#f97316', color: proc.kaizen ? '#fff' : '#f97316' }}
            onClick={() => upd({ kaizen: !proc.kaizen })}>
            ✦ Marcar Kaizen
          </button>

          {proc.kaizen && (
            <div className="properties-field">
              <label>Plano de Ação</label>
              {(proc.acoes || []).map((a) => (
                <div key={a.id} className="acao-card">
                  <div className="acao-row">
                    <input placeholder="O quê" value={a.oQue} onChange={(e) => updateAcao(id, a.id, { oQue: e.target.value })} />
                    <button className="shift-remove-btn" onClick={() => removeAcao(id, a.id)}>✕</button>
                  </div>
                  <input placeholder="Quem" value={a.quem} onChange={(e) => updateAcao(id, a.id, { quem: e.target.value })} />
                  <input type="date" value={a.quando} onChange={(e) => updateAcao(id, a.id, { quando: e.target.value })} />
                </div>
              ))}
              <button type="button" className="palette-button" onClick={() => addAcao(id)}>+ Adicionar ação</button>
            </div>
          )}
        </>
      )}
      <button
        className="props-delete-btn"
        onClick={() => removeProcess(id)}
      >
        Remover processo
      </button>
    </div>
  );
}

const FLOW_TYPES = [
  { value: 'push',         label: 'Push (Estoque)' },
  { value: 'supermercado', label: 'Supermercado' },
  { value: 'fifo',         label: 'FIFO Lane' },
  { value: 'kanban',       label: 'Kanban' },
];

function WipProps({ id }) {
  const wip    = useVsmStore((s) => s.wips.find((w) => w.id === id));
  const update = useVsmStore((s) => s.updateWip);
  if (!wip) return null;
  const upd = (patch) => update(id, patch);
  const type = wip.flowType || 'push';
  return (
    <div className="properties-group">
      <div className="properties-field">
        <label>Tipo de Conector</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {FLOW_TYPES.map((ft) => (
            <button key={ft.value} type="button"
              className={`info-flow-btn${type === ft.value ? ' active' : ''}`}
              style={{ justifyContent: 'flex-start' }}
              onClick={() => upd({ flowType: ft.value })}>
              {ft.label}
            </button>
          ))}
        </div>
      </div>
      <Field label="Material"   value={wip.material || ''} onChange={(v) => upd({ material: v })} />
      <Field label="Quantidade" value={wip.qty}           onChange={(v) => upd({ qty: v })} />
      <div className="properties-field">
        <label>Unidade</label>
        <select value={wip.unit} onChange={(e) => upd({ unit: e.target.value })}
          style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--gray-200)', background: 'var(--gray-100)', fontSize: 13 }}>
          {['pç','un','cx','kg','g','t','m','m²','m³','L','mL','rl','bobina','lote'].map(u =>
            <option key={u} value={u}>{u}</option>
          )}
        </select>
      </div>
      {wip.unit !== 'pç' && (
        <div className="properties-field">
          <label>Consumo diário ({wip.unit}/dia)</label>
          <input type="number" value={wip.consumoDiario ?? ''} min="0" step="any"
            placeholder="Ex: 100"
            onChange={(e) => upd({ consumoDiario: e.target.value })} />
          <span style={{ fontSize: 11, color: 'var(--gray-600)', marginTop: -4 }}>
            {(() => {
              const qty = parseFloat(wip.qty) || 0;
              const cd  = parseFloat(wip.consumoDiario);
              if (!cd) return 'Preencha para calcular o Lead Time corretamente';
              const dias = (qty / cd).toFixed(1);
              return `${dias} dias de cobertura`;
            })()}
          </span>
        </div>
      )}
      {wip.unit === 'pç' && (
        <div className="properties-field">
          <label>Fator → pç</label>
          <input type="number" value={wip.factor ?? '1'} min="0.0001" step="any"
            onChange={(e) => upd({ factor: e.target.value })} />
          <span style={{ fontSize: 11, color: 'var(--gray-600)', marginTop: -4 }}>
            1 {wip.unit} = {wip.factor ?? 1} pç
          </span>
        </div>
      )}
    </div>
  );
}

const EL_LABELS = {
  kaizen: 'Kaizen Burst', operador: 'Operador', fifo: 'FIFO',
  supermercado: 'Supermercado', kanban: 'Kanban', qualidade: 'Qualidade', heijunka: 'Heijunka',
};

function ElementProps({ id }) {
  const el            = useVsmStore((s) => s.elements.find((e) => e.id === id));
  const updateElement = useVsmStore((s) => s.updateElement);
  const removeElement = useVsmStore((s) => s.removeElement);
  if (!el) return null;
  return (
    <div className="properties-group">
      <Field label="Rótulo" value={el.label} onChange={(v) => updateElement(id, { label: v })} />
      <div className="properties-field">
        <label>Tipo</label>
        <div style={{ fontSize: 13, color: '#555', padding: '6px 0' }}>{EL_LABELS[el.type] || el.type}</div>
      </div>
      <button className="props-delete-btn" onClick={() => removeElement(id)}>
        Remover elemento
      </button>
    </div>
  );
}

export default function PropertiesPanel({ onClose }) {
  const selectedId = useVsmStore((s) => s.selectedId);

  const title = (() => {
    if (!selectedId) return 'Propriedades';
    if (selectedId === 'supplier') return 'Fornecedor';
    if (selectedId === 'customer') return 'Cliente';
    if (selectedId === 'pcp')      return 'PCP / MRP';
    if (selectedId.startsWith('proc-')) return 'Processo';
    if (selectedId.startsWith('wip-'))  return 'Estoque';
    if (selectedId.startsWith('el-'))   return 'Ícone VSM';
    return 'Propriedades';
  })();

  const body = (() => {
    if (!selectedId) return null;
    if (selectedId === 'supplier') return <SupplierProps />;
    if (selectedId === 'customer') return <CustomerProps />;
    if (selectedId === 'pcp')      return <PcpProps />;
    if (selectedId.startsWith('proc-')) return <ProcessProps id={selectedId.slice(5)} />;
    if (selectedId.startsWith('wip-'))  return <WipProps id={selectedId.slice(4)} />;
    if (selectedId.startsWith('el-'))   return <ElementProps id={selectedId} />;
    return null;
  })();

  return (
    <aside className="properties-panel">
      <div className="props-panel-header">
        <span className="panel-title">{title}</span>
        {onClose && <button className="props-close-btn" onClick={onClose}>✕</button>}
      </div>
      {body}
    </aside>
  );
}
