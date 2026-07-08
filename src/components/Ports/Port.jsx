import './Ports.css';

export default function Port({ side, node, onMouseDown, onMouseUp }) {
  return (
    <div
      className={`port port-${side}`}
      onMouseDown={(event) => onMouseDown(side, event)}
      onMouseUp={(event) => onMouseUp(side, event)}
    />
  );
}
