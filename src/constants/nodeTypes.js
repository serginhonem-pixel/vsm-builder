export const NODE_TYPES = {
  PROCESS: 'PROCESS',
  WIP: 'WIP',
  LOCATION: 'LOCATION',
  SUPPLIER: 'SUPPLIER',
  CUSTOMER: 'CUSTOMER',
};

export const MACHINES = {
  generic: { emoji: '⚙️', label: 'Genérica' },
  cut: { emoji: '✂️', label: 'Corte' },
  press: { emoji: '🛠️', label: 'Prensa' },
  weld: { emoji: '⚡', label: 'Solda' },
  bend: { emoji: '🔧', label: 'Dobra' },
  paint: { emoji: '🎨', label: 'Pintura' },
  punch: { emoji: '🔩', label: 'Punção' },
  assembly: { emoji: '🧩', label: 'Montagem' },
  inspect: { emoji: '🔎', label: 'Inspeção' },
  pack: { emoji: '📦', label: 'Expedição' },
};

export const NODE_DEFINITIONS = {
  [NODE_TYPES.PROCESS]: {
    label: 'Processo',
    defaultData: { name: 'Processo', machine: 'generic', machineLabel: 'Genérica', ct: '0,0', op: '0', uptime: '100%' },
  },
  [NODE_TYPES.WIP]: {
    label: 'WIP',
    defaultData: { name: 'Estoque WIP', qty: '0', unit: 'pcs' },
  },
  [NODE_TYPES.LOCATION]: {
    label: 'Localização',
    defaultData: { name: 'Local', loctype: 'warehouse', area: '0', cap: '0' },
  },
  [NODE_TYPES.SUPPLIER]: {
    label: 'Fornecedor',
    defaultData: { name: 'Fornecedor' },
  },
  [NODE_TYPES.CUSTOMER]: {
    label: 'Cliente',
    defaultData: { name: 'Cliente' },
  },
};

export const SAMPLE_FLOW = {
  nodes: [
    { id: 'supplier', type: NODE_TYPES.SUPPLIER, x: 40, y: 180, data: { name: 'Fornecedor' } },
    { id: 'stock', type: NODE_TYPES.LOCATION, x: 260, y: 170, data: { name: 'Almoxarifado MP', loctype: 'warehouse', area: '600', cap: '1200' } },
    { id: 'cut', type: NODE_TYPES.PROCESS, x: 520, y: 120, data: { name: 'Corte', machine: 'cut', machineLabel: 'Serra Fita', ct: '12,0', op: '1', uptime: '92%' } },
    { id: 'wip', type: NODE_TYPES.WIP, x: 760, y: 170, data: { name: 'WIP', qty: '60', unit: 'pcs' } },
    { id: 'bend', type: NODE_TYPES.PROCESS, x: 980, y: 120, data: { name: 'Dobra', machine: 'bend', machineLabel: 'Dobradeira', ct: '8,5', op: '1', uptime: '88%' } },
    { id: 'expedition', type: NODE_TYPES.LOCATION, x: 1220, y: 170, data: { name: 'PA Expedição', loctype: 'dock', area: '480', cap: '900' } },
    { id: 'customer', type: NODE_TYPES.CUSTOMER, x: 1460, y: 180, data: { name: 'Cliente' } },
  ],
  arrows: [
    { id: 'a1', from: 'supplier', to: 'stock', type: 'material' },
    { id: 'a2', from: 'stock', to: 'cut', type: 'material' },
    { id: 'a3', from: 'cut', to: 'wip', type: 'material' },
    { id: 'a4', from: 'wip', to: 'bend', type: 'material' },
    { id: 'a5', from: 'bend', to: 'expedition', type: 'material' },
    { id: 'a6', from: 'expedition', to: 'customer', type: 'material' },
  ],
};
