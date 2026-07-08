export default function ProcessNode({ data }) {
  return (
    <div className="process-node">
      <div className="proc-header">{data.name}</div>
      <div className="proc-body">
        <div className="gear-wrap"><div className="gear-inner" /></div>
        <div className="proc-fields">
          <div className="pf-row">
            <span className="pf-label">TC</span>
            <span className="pf-val">{data.ct} min</span>
          </div>
          <div className="pf-row">
            <span className="pf-label">Ops</span>
            <span className="pf-val">{data.op}</span>
          </div>
          <div className="pf-row">
            <span className="pf-label">Uptime</span>
            <span className="pf-val">{data.uptime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
