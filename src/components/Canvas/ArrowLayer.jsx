import { getEdgePath } from '../../utils/geometry.js';

export default function ArrowLayer({ arrows, nodes, selectedArrowId, onArrowClick, onArrowDoubleClick }) {
  const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]));

  const getMidpoint = (from, to) => {
    return {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2,
    };
  };

  return (
    <g className="arrow-layer">
      {arrows.map((arrow) => {
        const from = nodeMap[arrow.from];
        const to = nodeMap[arrow.to];
        if (!from || !to) return null;
        const path = getEdgePath(from, to);
        const mid = getMidpoint(from, to);

        return (
          <g key={arrow.id}>
            <path
              d={path}
              className={`arrow-path ${arrow.type} ${selectedArrowId === arrow.id ? 'selected' : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                onArrowClick(arrow.id);
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                onArrowDoubleClick(arrow.id);
              }}
              markerEnd={`url(#arrowhead-${arrow.type})`}
            />
            {arrow.type === 'material' && (
              <text
                x={mid.x}
                y={mid.y - 8}
                className="arrow-label"
                pointerEvents="none"
                textAnchor="middle"
              >
                PROGRAMA
              </text>
            )}
          </g>
        );
      })}
      <defs>
        <marker id="arrowhead-material" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8" fill="#e33" />
        </marker>
        <marker id="arrowhead-information" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8" fill="#ea580c" />
        </marker>
      </defs>
    </g>
  );
}
