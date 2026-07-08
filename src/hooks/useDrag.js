import { useEffect, useRef } from 'react';
import { useVsmStore } from '../store/useVsmStore.js';

export function useDrag(canvasRef) {
  const draggingRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!draggingRef.current) return;
      event.preventDefault();
      const { id, startX, startY, nodeX, nodeY } = draggingRef.current;
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      const x = nodeX + event.clientX - startX;
      const y = nodeY + event.clientY - startY;
      useVsmStore.getState().updateNode(id, { x: Math.max(0, x), y: Math.max(0, y) });
    };

    const handleMouseUp = () => {
      draggingRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [canvasRef]);

  const handleNodeMouseDown = (event, id) => {
    event.stopPropagation();
    const node = useVsmStore.getState().nodes.find((item) => item.id === id);
    if (!node) return;
    draggingRef.current = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      nodeX: node.x,
      nodeY: node.y,
    };
  };

  return { handleNodeMouseDown };
}
