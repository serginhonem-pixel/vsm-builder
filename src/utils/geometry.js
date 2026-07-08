const NODE_W = 210;
const NODE_H = 120;

export function getNodeCenter(node) {
  return {
    x: node.x + NODE_W / 2,
    y: node.y + NODE_H / 2,
  };
}

export function getPortPoint(node, side) {
  switch (side) {
    case 'top':
      return { x: node.x + NODE_W / 2, y: node.y };
    case 'bottom':
      return { x: node.x + NODE_W / 2, y: node.y + NODE_H };
    case 'left':
      return { x: node.x, y: node.y + NODE_H / 2 };
    case 'right':
    default:
      return { x: node.x + NODE_W, y: node.y + NODE_H / 2 };
  }
}

export function getEdgePath(source, target) {
  const from = getPortPoint(source, 'right');
  const to = getPortPoint(target, 'left');
  const mx = Math.max(80, Math.abs(to.x - from.x) / 2);
  return `M ${from.x} ${from.y} C ${from.x + mx} ${from.y} ${to.x - mx} ${to.y} ${to.x} ${to.y}`;
}
