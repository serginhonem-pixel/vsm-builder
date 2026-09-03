export const SCHEMA_VERSION = 1;

const SERIALIZED_KEYS = [
  'supplier', 'customer', 'pcp',
  'processes', 'wips', 'elements', 'shingoSteps',
  'demand', 'available', 'lote', 'shifts',
  'activeState', 'savedStates',
];

export function serializeFlowState(store) {
  const out = {};
  for (const k of SERIALIZED_KEYS) out[k] = store[k];
  return JSON.parse(JSON.stringify(out)); // sem refs, sem undefined
}

export function hydrateFlowState(state = {}) {
  return {
    supplier: state.supplier || { name: 'FORNECEDOR', product: 'MATÉRIA-PRIMA' },
    customer: state.customer || { name: 'CLIENTE' },
    pcp: state.pcp || { name: 'PCP\nMRP' },
    processes: state.processes || [],
    wips: state.wips || [{ id: 'w0', qty: '0', unit: 'pç' }],
    elements: state.elements || [],
    shingoSteps: state.shingoSteps || [],
    demand: state.demand ?? 200,
    available: state.available ?? 480,
    lote: state.lote ?? 1,
    shifts: state.shifts || [{ id: 's1', name: 'Turno 1', available: 480 }],
    activeState: state.activeState || 'atual',
    savedStates: state.savedStates || { atual: null, futuro: null },
    selectedId: null,
  };
}
