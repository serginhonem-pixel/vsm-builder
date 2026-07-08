import { useRef } from 'react';
import { useVsmStore } from '../../store/useVsmStore.js';
import { useDrag } from '../../hooks/useDrag.js';
import { useConnect } from '../../hooks/useConnect.js';
import { useKeyboard } from '../../hooks/useKeyboard.js';
import ArrowLayer from './ArrowLayer.jsx';
import TempArrow from './TempArrow.jsx';
import NodeWrapper from '../Nodes/NodeWrapper.jsx';
import '../../components/Canvas/Canvas.css';

export default function Canvas() {
  const canvasRef = useRef(null);
  const nodes = useVsmStore((state) => state.nodes);
  const arrows = useVsmStore((state) => state.arrows);
  const selectedNodeId = useVsmStore((state) => state.selectedNodeId);
  const selectedArrowId = useVsmStore((state) => state.selectedArrowId);
  const setSelected = useVsmStore((state) => state.setSelected);
  const deleteArrow = useVsmStore((state) => state.deleteArrow);
  const setSelectedArrow = useVsmStore((state) => state.setSelectedArrow);
  const arrowType = useVsmStore((state) => state.arrowType);

  const { handleNodeMouseDown } = useDrag(canvasRef);
  const { connectState, stopConnect, handlePortMouseDown, handlePortMouseUp, handleCanvasMouseMove } = useConnect();
  useKeyboard({ deleteArrow, selectedNodeId, selectedArrowId, setSelected, setSelectedArrow });

  const handleArrowClick = (arrowId) => {
    setSelectedArrow(arrowId);
  };

  const handleArrowDoubleClick = (arrowId) => {
    deleteArrow(arrowId);
  };

  return (
    <section className="canvas-shell" onMouseDown={() => { setSelected(null); setSelectedArrow(null); }}>
      <div
        className="canvas-view"
        ref={canvasRef}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={stopConnect}
      >
        <div className="canvas-content">
          <div className="canvas-grid" />
          {nodes.map((node) => (
            <NodeWrapper
              key={node.id}
              node={node}
              selected={selectedNodeId === node.id}
              onSelect={(event) => { event.stopPropagation(); setSelected(node.id); }}
              onDelete={() => useVsmStore.getState().deleteNode(node.id)}
              onDragStart={(event) => handleNodeMouseDown(event, node.id)}
              onPortMouseDown={(side, event) => handlePortMouseDown(event, node, side)}
              onPortMouseUp={(side, event) => handlePortMouseUp(event, node, side, arrowType)}
            />
          ))}
          <svg className="canvas-overlay" aria-hidden="true">
            <defs>
              <marker id="arrowhead-temp" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M0,0 L8,4 L0,8" fill="#5a5f66" />
              </marker>
            </defs>
            <ArrowLayer
              arrows={arrows}
              nodes={nodes}
              selectedArrowId={selectedArrowId}
              onArrowClick={handleArrowClick}
              onArrowDoubleClick={handleArrowDoubleClick}
            />
            <TempArrow connectState={connectState} />
          </svg>
        </div>
        <div className="canvas-timeline">
          <div className="timeline-track">
            <span>Lead Time</span>
            <div className="timeline-segment">3 mn</div>
            <div className="timeline-segment">10 mn</div>
            <div className="timeline-segment">46 h</div>
            <div className="timeline-segment">27 h</div>
            <div className="timeline-segment">0.1 h</div>
            <div className="timeline-segment">113 h</div>
          </div>
          <div className="timeline-summary">LT = 358.5h · VA = 22mn</div>
        </div>
      </div>
    </section>
  );
}
