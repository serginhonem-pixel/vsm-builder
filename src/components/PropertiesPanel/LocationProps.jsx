export default function LocationProps({ node, updateNode }) {
  return (
    <div className="properties-group">
      <div className="properties-field">
        <label>Nome</label>
        <input value={node.data.name} onChange={(event) => updateNode(node.id, { data: { ...node.data, name: event.target.value } })} />
      </div>
      <div className="properties-field-row">
        <div>
          <label>Tipo</label>
          <input value={node.data.loctype} onChange={(event) => updateNode(node.id, { data: { ...node.data, loctype: event.target.value } })} />
        </div>
        <div>
          <label>Área</label>
          <input value={node.data.area} onChange={(event) => updateNode(node.id, { data: { ...node.data, area: event.target.value } })} />
        </div>
      </div>
      <div className="properties-field">
        <label>Capacidade</label>
        <input value={node.data.cap} onChange={(event) => updateNode(node.id, { data: { ...node.data, cap: event.target.value } })} />
      </div>
    </div>
  );
}
