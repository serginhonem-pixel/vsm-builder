export default function InfoNode({ data }) {
  return (
    <div className="node-body info-node">
      <div className="node-title">{data.name}</div>
      <div className="node-meta">{data.frequency}</div>
      <div className="node-fields info-fields">
        <div>Fluxo de informação</div>
      </div>
    </div>
  );
}
