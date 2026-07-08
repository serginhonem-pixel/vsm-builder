export default function InventoryNode({ data }) {
  return (
    <div className="node-body inventory-node">
      <div className="inventory-badge">ESTOQUE</div>
      <div className="node-title">{data.name}</div>
      <div className="node-meta">{data.qty} {data.unit}</div>
      <div className="node-fields">
        <div>Estoque</div>
      </div>
    </div>
  );
}
