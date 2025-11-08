import { Stage, Layer, Rect, Circle, Text, Arrow, Group } from 'react-konva';
import { VisualNode, VisualEdge } from '../utils/policyParser';

interface CanvasVisualizerProps {
  nodes: VisualNode[];
  edges: VisualEdge[];
  width: number;
  height: number;
  onNodePositionChange?: (nodeId: string, x: number, y: number) => void;
}

const CanvasVisualizer = ({ nodes, edges, width, height, onNodePositionChange }: CanvasVisualizerProps) => {
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'namespace':
        return '#4A90E2';
      case 'pod':
        return '#7ED321';
      case 'external':
        return '#F5A623';
      default:
        return '#CCCCCC';
    }
  };

  const getEdgeColor = (edge: VisualEdge) => {
    if (edge.action === 'Deny') return '#D0021B';
    if (edge.action === 'Allow') return '#7ED321';
    if (edge.action === 'Pass') return '#F8E71C';
    return edge.type === 'ingress' ? '#4A90E2' : '#BD10E0';
  };

  const renderNode = (node: VisualNode) => {
    const color = getNodeColor(node.type);
    const shape = node.type === 'pod' ? 'circle' : 'rect';

    const handleDragEnd = (e: { target: { x: () => number; y: () => number } }) => {
      if (onNodePositionChange) {
        onNodePositionChange(node.id, e.target.x(), e.target.y());
      }
    };

    const width = node.width ?? (shape === 'rect' ? 120 : 80);
    const height = node.height ?? (shape === 'rect' ? 60 : 80);
    const offsetX = width / 2;
    const offsetY = height / 2;
    const labelText = node.namespace ? `${node.label}\nns: ${node.namespace}` : node.label;
    const fontSize = 12;
    const lineHeight = 1.2;
    const textLines = labelText.split('\n');
    const textWidth = Math.max(width - 20, 80);
    const textHeight = textLines.length * fontSize * lineHeight + 4;

    return (
      <Group 
        key={node.id} 
        x={node.x} 
        y={node.y} 
        draggable
        onDragEnd={handleDragEnd}
      >
        {shape === 'rect' ? (
          <Rect
            width={width}
            height={height}
            fill={color}
            stroke="#000000"
            strokeWidth={2}
            cornerRadius={8}
            offsetX={offsetX}
            offsetY={offsetY}
          />
        ) : (
          <Circle
            radius={Math.max(width, height) / 2}
            fill={color}
            stroke="#000000"
            strokeWidth={2}
          />
        )}
        <Text
          text={labelText}
          fontSize={fontSize}
          fill="#FFFFFF"
          fontStyle="bold"
          width={textWidth}
          align="center"
          x={-textWidth / 2}
          y={-textHeight / 2}
          lineHeight={lineHeight}
          padding={4}
        />
      </Group>
    );
  };

  const renderEdge = (edge: VisualEdge) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    if (!sourceNode || !targetNode) return null;

    const color = getEdgeColor(edge);
    const dash = edge.type === 'egress' ? [10, 5] : undefined;
    const midX = (sourceNode.x + targetNode.x) / 2;
    const midY = (sourceNode.y + targetNode.y) / 2;
    const hasAction = Boolean(edge.action);
    const hasPorts = Boolean(edge.ports && edge.ports.length > 0);
    const portsText = hasPorts ? edge.ports!.join(', ') : undefined;
    const dx = targetNode.x - sourceNode.x;
    const dy = targetNode.y - sourceNode.y;
    const isMostlyHorizontal = Math.abs(dx) >= Math.abs(dy);

  const actionWidth = 140;
  const portsWidth = 160;
  const verticalGapTop = hasPorts ? 26 : 16;

    let actionPos: { x: number; y: number } | undefined;
    let portsPos: { x: number; y: number } | undefined;

    if (isMostlyHorizontal) {
      if (hasAction) {
        actionPos = {
          x: midX - actionWidth / 2,
          y: midY - verticalGapTop,
        };
      }
      if (portsText) {
        portsPos = {
          x: midX - portsWidth / 2,
          y: midY + 10,
        };
      }
    } else {
      if (hasAction && portsText) {
        const sideOffset = 80;
        actionPos = {
          x: midX - sideOffset - actionWidth / 2,
          y: midY - 10,
        };
        portsPos = {
          x: midX + sideOffset - portsWidth / 2,
          y: midY - 10,
        };
      } else if (hasAction) {
        actionPos = {
          x: midX - actionWidth / 2,
          y: midY - 20,
        };
      } else if (portsText) {
        portsPos = {
          x: midX - portsWidth / 2,
          y: midY - 20,
        };
      }
    }

    return (
      <Group key={edge.id}>
        <Arrow
          points={[sourceNode.x, sourceNode.y, targetNode.x, targetNode.y]}
          stroke={color}
          strokeWidth={3}
          fill={color}
          dash={dash}
          pointerLength={10}
          pointerWidth={10}
        />
        {hasAction && actionPos && (
          <Text
            text={edge.action}
            x={actionPos.x}
            y={actionPos.y}
            fontSize={10}
            fill={color}
            fontStyle="bold"
            width={actionWidth}
            align="center"
            padding={2}
          />
        )}
        {portsText && portsPos && (
          <Text
            text={portsText}
            x={portsPos.x}
            y={portsPos.y}
            fontSize={10}
            fill="#000000"
            width={portsWidth}
            align="center"
            padding={2}
          />
        )}
      </Group>
    );
  };

  return (
    <Stage width={width} height={height}>
      <Layer>
        {edges.map(renderEdge)}
        {nodes.map(renderNode)}
      </Layer>
    </Stage>
  );
};

export default CanvasVisualizer;
