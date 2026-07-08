export default function InfoProps({ node, updateNode }) {
  return (
    <div className="properties-group">
      <div className="properties-field">
        <label>Nome</label>
        <input value={node.data.name} onChange={(event) => updateNode(node.id, { data: { ...node.data, name: event.target.value } })} />
      </div>
      <div className="properties-field">
        <label>Frequência</label>
        <input value={node.data.frequency} onChange={(event) => updateNode(node.id, { data: { ...node.data, frequency: event.target.value } })} />
      </div>
    </div>
  );
}
