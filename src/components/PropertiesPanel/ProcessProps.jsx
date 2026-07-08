export default function ProcessProps({ node, updateNode }) {
  return (
    <div className="properties-group">
      <div className="properties-field">
        <label>Nome</label>
        <input value={node.data.name} onChange={(event) => updateNode(node.id, { data: { ...node.data, name: event.target.value } })} />
      </div>
      <div className="properties-field">
        <label>Máquina</label>
        <input value={node.data.machineLabel} onChange={(event) => updateNode(node.id, { data: { ...node.data, machineLabel: event.target.value } })} />
      </div>
      <div className="properties-field-row">
        <div>
          <label>CT</label>
          <input value={node.data.ct} onChange={(event) => updateNode(node.id, { data: { ...node.data, ct: event.target.value } })} />
        </div>
        <div>
          <label>OP</label>
          <input value={node.data.op} onChange={(event) => updateNode(node.id, { data: { ...node.data, op: event.target.value } })} />
        </div>
      </div>
      <div className="properties-field">
        <label>Uptime</label>
        <input value={node.data.uptime} onChange={(event) => updateNode(node.id, { data: { ...node.data, uptime: event.target.value } })} />
      </div>
    </div>
  );
}
