import { useState } from 'react';
import { useVsmStore } from '../store/useVsmStore.js';
import { getPortPoint } from '../utils/geometry.js';

export function useConnect() {
  const [connectState, setConnectState] = useState(null);
  const addArrow = useVsmStore((state) => state.addArrow);
  const arrows = useVsmStore((state) => state.arrows);

  const handlePortMouseDown = (event, node, side) => {
    event.stopPropagation();
    const fromPoint = getPortPoint(node, side);
    setConnectState({ fromNode: node, fromPoint, side, toPoint: fromPoint });
  };

  const handleCanvasMouseMove = (event) => {
    if (!connectState) return;
    const canvasRect = event.currentTarget.getBoundingClientRect();
    setConnectState((current) => ({
      ...current,
      toPoint: {
        x: event.clientX - canvasRect.left,
        y: event.clientY - canvasRect.top,
      },
    }));
  };

  const handlePortMouseUp = (event, node, side, arrowType) => {
    if (!connectState || connectState.fromNode.id === node.id) return;
    event.stopPropagation();
    const toPoint = getPortPoint(node, side);
    const id = `arrow-${Date.now()}`;
    addArrow({ id, from: connectState.fromNode.id, to: node.id, type: arrowType });
    setConnectState(null);
  };

  const stopConnect = () => {
    setConnectState(null);
  };

  return { connectState, startConnect: null, stopConnect, handlePortMouseDown, handlePortMouseUp, handleCanvasMouseMove };
}
