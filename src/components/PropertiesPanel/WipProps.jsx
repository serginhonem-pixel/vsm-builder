export default function WipProps({ node, updateNode }) {
  return (
    <div className="properties-group">
      <div className="properties-field">
        <label>Nome</label>
        <input value={node.data.name} onChange={(event) => updateNode(node.id, { data: { ...node.data, name: event.target.value } })} />
      </div>
      <div className="properties-field-row">
        <div>
          <label>Quantidade</label>
          <input value={node.data.qty} onChange={(event) => updateNode(node.id, { data: { ...node.data, qty: event.target.value } })} />
        </div>
        <div>
          <label>Unidade</label>
          <input value={node.data.unit} onChange={(event) => updateNode(node.id, { data: { ...node.data, unit: event.target.value } })} />
        </div>
      </div>
    </div>
  );
}
