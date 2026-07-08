export default function TempArrow({ connectState }) {
  if (!connectState || !connectState.fromNode || !connectState.fromPoint) return null;

  const { fromPoint, toPoint } = connectState;
  const path = `M ${fromPoint.x} ${fromPoint.y} C ${fromPoint.x + 80} ${fromPoint.y} ${toPoint.x - 80} ${toPoint.y} ${toPoint.x} ${toPoint.y}`;

  return (
    <path d={path} className="temp-arrow" markerEnd="url(#arrowhead-temp)" />
  );
}
