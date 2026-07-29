export function ctToMin(p) {
  const v = parseFloat(String(p.ct).replace(',', '.')) || 0;
  if (p.ctUnit === 'Seg') return v / 60;
  if (p.ctUnit === 'H')   return v * 60;
  return v; // Min (padrão)
}

export function computeKpis({ processes, wips, demand, available }) {
  const takt = demand > 0 ? available / demand : 0;

  const totalTC = processes.reduce((sum, p) => sum + ctToMin(p), 0);

  const totalWait = wips.reduce((sum, w) => {
    return sum + (parseFloat(w.qty) || 0) * (takt || 1);
  }, 0);

  const lt  = totalTC + totalWait;
  const eff = lt > 0 ? (totalTC / lt) * 100 : 0;

  return { takt, totalTC, lt, eff };
}
