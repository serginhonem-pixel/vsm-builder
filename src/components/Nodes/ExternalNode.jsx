export default function ExternalNode({ data, label }) {
  return (
    <div className="external-node">
      <div className="external-label">{label}</div>
      {data.name && <div className="external-name">{data.name}</div>}
    </div>
  );
}
