import {
  Policy,
  NetworkPolicy,
  AdminNetworkPolicy,
  BaseAdminNetworkPolicy,
  LabelSelector,
  AdminNetworkPolicyPort,
} from '../types/policies';

// Layout configuration constants
const LAYOUT_CONFIG = {
  NODES_PER_ROW: 5,
  NODE_HORIZONTAL_SPACING: 200,
  NODE_VERTICAL_SPACING: 150,
  INITIAL_X_OFFSET: 100,
  INITIAL_Y_OFFSET: 100,
};

export interface VisualNode {
  id: string;
  type: 'namespace' | 'pod' | 'external';
  label: string;
  namespace?: string;
  selector?: LabelSelector;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface VisualEdge {
  id: string;
  source: string;
  target: string;
  type: 'ingress' | 'egress';
  action?: 'Allow' | 'Deny' | 'Pass';
  ports?: string[];
  policyName: string;
  policyKind: string;
}

export interface VisualizationData {
  nodes: VisualNode[];
  edges: VisualEdge[];
}

function getLabelText(selector?: LabelSelector): string {
  if (!selector) return 'any';
  if (selector.matchLabels) {
    const entries = Object.entries(selector.matchLabels);
    if (entries.length === 0) return 'any';
    return entries
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
  }
  if (selector.matchExpressions && selector.matchExpressions.length > 0) {
    return selector.matchExpressions
      .map(exp => `${exp.key} ${exp.operator} ${exp.values?.join(',') || ''}`)
      .join(', ');
  }
  return 'any';
}

function formatAdminPort(port: AdminNetworkPolicyPort): string | null {
  if (!port) return null;
  if (port.portNumber) {
    const proto = port.portNumber.protocol?.toUpperCase() || 'TCP';
    return `${proto}:${port.portNumber.port}`;
  }
  if (port.portRange) {
    const proto = port.portRange.protocol?.toUpperCase() || 'TCP';
    return `${proto}:${port.portRange.start}-${port.portRange.end}`;
  }
  if (port.namedPort) {
    return `named:${port.namedPort}`;
  }
  return null;
}

export function extractVisualizationData(policies: Policy[]): VisualizationData {
  const nodes: VisualNode[] = [];
  const edges: VisualEdge[] = [];
  const nodeMap = new Map<string, VisualNode>();

  let nodeCounter = 0;
  let edgeCounter = 0;

  const estimateTextSize = (text: string, fontSize = 12, padding = 20) => {
    const lines = text.split('\n');
    const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 0);
    const width = Math.max(80, longestLine * (fontSize * 0.6) + padding);
    const height = lines.length * (fontSize + 6) + padding;
    return { width, height };
  };

  const createOrGetNode = (
    type: 'namespace' | 'pod' | 'external',
    label: string,
    namespace?: string,
    selector?: LabelSelector
  ): VisualNode => {
    const id = `${type}-${namespace || 'global'}-${label}`;
    if (nodeMap.has(id)) {
      return nodeMap.get(id)!;
    }

    const labelText = namespace ? `${label}\n(ns: ${namespace})` : label;
    const { width, height } = estimateTextSize(labelText, 12, 30);

    const node: VisualNode = {
      id,
      type,
      label,
      namespace,
      selector,
      x: (nodeCounter % LAYOUT_CONFIG.NODES_PER_ROW) * LAYOUT_CONFIG.NODE_HORIZONTAL_SPACING + LAYOUT_CONFIG.INITIAL_X_OFFSET,
      y: Math.floor(nodeCounter / LAYOUT_CONFIG.NODES_PER_ROW) * LAYOUT_CONFIG.NODE_VERTICAL_SPACING + LAYOUT_CONFIG.INITIAL_Y_OFFSET,
      width,
      height,
    };
    nodeCounter++;
    nodeMap.set(id, node);
    nodes.push(node);
    return node;
  };

  policies.forEach(policy => {
    if (policy.kind === 'NetworkPolicy') {
      const np = policy as NetworkPolicy;
      const targetNode = createOrGetNode(
        'pod',
        `pods: ${getLabelText(np.spec.podSelector)}`,
        np.metadata.namespace,
        np.spec.podSelector
      );

      // Process ingress rules
      np.spec.ingress?.forEach(rule => {
        rule.from?.forEach(peer => {
          let sourceNode: VisualNode;
          if (peer.podSelector) {
            sourceNode = createOrGetNode(
              'pod',
              `pods: ${getLabelText(peer.podSelector)}`,
              np.metadata.namespace,
              peer.podSelector
            );
          } else if (peer.namespaceSelector) {
            sourceNode = createOrGetNode(
              'namespace',
              `ns: ${getLabelText(peer.namespaceSelector)}`,
              undefined,
              peer.namespaceSelector
            );
          } else if (peer.ipBlock) {
            sourceNode = createOrGetNode(
              'external',
              `CIDR: ${peer.ipBlock.cidr}`,
              undefined
            );
          } else {
            sourceNode = createOrGetNode('external', 'any', undefined);
          }

          const ports = rule.ports?.map(p => `${p.protocol || 'TCP'}:${p.port}`);
          edges.push({
            id: `edge-${edgeCounter++}`,
            source: sourceNode.id,
            target: targetNode.id,
            type: 'ingress',
            ports,
            policyName: np.metadata.name,
            policyKind: 'NetworkPolicy',
          });
        });
      });

      // Process egress rules
      np.spec.egress?.forEach(rule => {
        rule.to?.forEach(peer => {
          let targetEgressNode: VisualNode;
          if (peer.podSelector) {
            targetEgressNode = createOrGetNode(
              'pod',
              `pods: ${getLabelText(peer.podSelector)}`,
              np.metadata.namespace,
              peer.podSelector
            );
          } else if (peer.namespaceSelector) {
            targetEgressNode = createOrGetNode(
              'namespace',
              `ns: ${getLabelText(peer.namespaceSelector)}`,
              undefined,
              peer.namespaceSelector
            );
          } else if (peer.ipBlock) {
            targetEgressNode = createOrGetNode(
              'external',
              `CIDR: ${peer.ipBlock.cidr}`,
              undefined
            );
          } else {
            targetEgressNode = createOrGetNode('external', 'any', undefined);
          }

          const ports = rule.ports?.map(p => `${p.protocol || 'TCP'}:${p.port}`);
          edges.push({
            id: `edge-${edgeCounter++}`,
            source: targetNode.id,
            target: targetEgressNode.id,
            type: 'egress',
            ports,
            policyName: np.metadata.name,
            policyKind: 'NetworkPolicy',
          });
        });
      });
    } else if (policy.kind === 'AdminNetworkPolicy') {
      const anp = policy as AdminNetworkPolicy;
      const subjectLabel = anp.spec.subject.namespaces
        ? `ns: ${getLabelText(anp.spec.subject.namespaces)}`
        : `pods: ${getLabelText(anp.spec.subject.pods?.podSelector)}`;
      
      const targetNode = createOrGetNode(
        anp.spec.subject.namespaces ? 'namespace' : 'pod',
        subjectLabel,
        undefined,
        anp.spec.subject.namespaces || anp.spec.subject.pods?.podSelector
      );

      // Process ingress rules
      anp.spec.ingress?.forEach(rule => {
        rule.from.forEach(peer => {
          const sourceNode = createOrGetNode(
            peer.namespaces ? 'namespace' : 'pod',
            peer.namespaces
              ? `ns: ${getLabelText(peer.namespaces)}`
              : `pods: ${getLabelText(peer.pods?.podSelector)}`,
            undefined,
            peer.namespaces || peer.pods?.podSelector
          );

          const ports = rule.ports
            ?.map(formatAdminPort)
            .filter((p): p is string => Boolean(p));

          edges.push({
            id: `edge-${edgeCounter++}`,
            source: sourceNode.id,
            target: targetNode.id,
            type: 'ingress',
            action: rule.action,
            ports,
            policyName: anp.metadata.name,
            policyKind: 'AdminNetworkPolicy',
          });
        });
      });

      // Process egress rules
      anp.spec.egress?.forEach(rule => {
        rule.to.forEach(peer => {
          const targetEgressNode = createOrGetNode(
            peer.namespaces ? 'namespace' : 'pod',
            peer.namespaces
              ? `ns: ${getLabelText(peer.namespaces)}`
              : `pods: ${getLabelText(peer.pods?.podSelector)}`,
            undefined,
            peer.namespaces || peer.pods?.podSelector
          );

          const ports = rule.ports
            ?.map(formatAdminPort)
            .filter((p): p is string => Boolean(p));

          edges.push({
            id: `edge-${edgeCounter++}`,
            source: targetNode.id,
            target: targetEgressNode.id,
            type: 'egress',
            action: rule.action,
            ports,
            policyName: anp.metadata.name,
            policyKind: 'AdminNetworkPolicy',
          });
        });
      });
    } else if (policy.kind === 'BaseAdminNetworkPolicy') {
      const banp = policy as BaseAdminNetworkPolicy;
      const subjectLabel = banp.spec.subject.namespaceSelector
        ? `ns: ${getLabelText(banp.spec.subject.namespaceSelector)}`
        : `pods: ${getLabelText(banp.spec.subject.podSelector)}`;
      
      const targetNode = createOrGetNode(
        banp.spec.subject.namespaceSelector ? 'namespace' : 'pod',
        subjectLabel,
        undefined,
        banp.spec.subject.namespaceSelector || banp.spec.subject.podSelector
      );

      // Process ingress rules
      banp.spec.ingress?.forEach(rule => {
        rule.from.forEach(peer => {
          const sourceNode = createOrGetNode(
            peer.namespaces ? 'namespace' : 'pod',
            peer.namespaces
              ? `ns: ${getLabelText(peer.namespaces)}`
              : `pods: ${getLabelText(peer.pods?.podSelector)}`,
            undefined,
            peer.namespaces || peer.pods?.podSelector
          );

          const ports = rule.ports
            ?.map(formatAdminPort)
            .filter((p): p is string => Boolean(p));

          edges.push({
            id: `edge-${edgeCounter++}`,
            source: sourceNode.id,
            target: targetNode.id,
            type: 'ingress',
            action: rule.action,
            ports,
            policyName: banp.metadata.name,
            policyKind: 'BaseAdminNetworkPolicy',
          });
        });
      });

      // Process egress rules
      banp.spec.egress?.forEach(rule => {
        rule.to.forEach(peer => {
          const targetEgressNode = createOrGetNode(
            peer.namespaces ? 'namespace' : 'pod',
            peer.namespaces
              ? `ns: ${getLabelText(peer.namespaces)}`
              : `pods: ${getLabelText(peer.pods?.podSelector)}`,
            undefined,
            peer.namespaces || peer.pods?.podSelector
          );

          const ports = rule.ports
            ?.map(formatAdminPort)
            .filter((p): p is string => Boolean(p));

          edges.push({
            id: `edge-${edgeCounter++}`,
            source: targetNode.id,
            target: targetEgressNode.id,
            type: 'egress',
            action: rule.action,
            ports,
            policyName: banp.metadata.name,
            policyKind: 'BaseAdminNetworkPolicy',
          });
        });
      });
    }
  });

  return { nodes, edges };
}
