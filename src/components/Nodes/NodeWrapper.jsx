import { useMemo } from 'react';
import ProcessNode from './ProcessNode.jsx';
import LocationNode from './LocationNode.jsx';
import WipNode from './WipNode.jsx';
import ExternalNode from './ExternalNode.jsx';
import Port from '../Ports/Port.jsx';
import '../../components/Nodes/Nodes.css';
import { NODE_TYPES } from '../../constants/nodeTypes.js';

const renderNode = (node) => {
  switch (node.type) {
    case NODE_TYPES.PROCESS:
      return <ProcessNode data={node.data} />;
    case NODE_TYPES.LOCATION:
      return <LocationNode data={node.data} />;
    case NODE_TYPES.WIP:
      return <WipNode data={node.data} />;
    case NODE_TYPES.SUPPLIER:
      return <ExternalNode data={node.data} label="Fornecedor" />;
    case NODE_TYPES.CUSTOMER:
      return <ExternalNode data={node.data} label="Cliente" />;
    default:
      return null;
  }
};

export default function NodeWrapper({ node, selected, onSelect, onDelete, onDragStart, onPortMouseDown, onPortMouseUp }) {
  const position = useMemo(() => ({ left: `${node.x}px`, top: `${node.y}px` }), [node.x, node.y]);

  return (
    <div className={`node-card node-card--${node.type.toLowerCase()} ${selected ? 'selected' : ''}`} style={position} onMouseDown={onSelect}>
      <button type="button" className="node-delete" onClick={(event) => { event.stopPropagation(); onDelete(); }}>
        ×
      </button>
      <div className="node-inner" onMouseDown={onDragStart}>
        {renderNode(node)}
      </div>
      <Port side="top" node={node} onMouseDown={onPortMouseDown} onMouseUp={onPortMouseUp} />
      <Port side="right" node={node} onMouseDown={onPortMouseDown} onMouseUp={onPortMouseUp} />
      <Port side="bottom" node={node} onMouseDown={onPortMouseDown} onMouseUp={onPortMouseUp} />
      <Port side="left" node={node} onMouseDown={onPortMouseDown} onMouseUp={onPortMouseUp} />
    </div>
  );
}
