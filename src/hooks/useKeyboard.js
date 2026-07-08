import { useEffect } from 'react';
import { useVsmStore } from '../store/useVsmStore.js';

export function useKeyboard({ deleteArrow, selectedNodeId, selectedArrowId, setSelected, setSelectedArrow }) {
  const deleteNode = useVsmStore((state) => state.deleteNode);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedNodeId) {
          deleteNode(selectedNodeId);
        }
        if (selectedArrowId) {
          deleteArrow(selectedArrowId);
        }
      }
      if (event.key === 'Escape') {
        setSelected(null);
        setSelectedArrow(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteArrow, deleteNode, selectedNodeId, selectedArrowId, setSelected, setSelectedArrow]);
}
