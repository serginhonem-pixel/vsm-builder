export default function LocationNode({ data }) {
  return (
    <div className="location-node">
      <div className="loc-title">{data.name}</div>
      <div className="loc-type-badge">{data.loctype}</div>
      <div className="loc-fields">
        <div className="loc-row">
          <span className="loc-row-label">Área</span>
          <span className="loc-row-val">{data.area} m²</span>
        </div>
        <div className="loc-row">
          <span className="loc-row-label">Cap</span>
          <span className="loc-row-val">{data.cap} pç</span>
        </div>
      </div>
    </div>
  );
}
