export default function WipNode({ data }) {
  return (
    <div className="wip-node">
      <div className="wip-triangle-wrap">
        <div className="wip-tri">
          <span className="wip-tri-label">I</span>
        </div>
      </div>
      <div className="wip-qty">
        {data.qty} <span className="wip-unit">{data.unit}</span>
      </div>
    </div>
  );
}
