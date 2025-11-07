import { useState } from 'react';
import { loadAll } from 'js-yaml';
import {
  Policy,
  LabelSelector,
  NetworkPolicy,
  NetworkPolicyPeer,
  NetworkPolicyPort,
  AdminNetworkPolicy,
  AdminNetworkPolicyPeer,
  AdminNetworkPolicyPort,
  BaseAdminNetworkPolicy,
} from '../types/policies';

interface PolicyEditorProps {
  onPoliciesChange: (policies: Policy[]) => void;
}

type AdminAction = 'Allow' | 'Deny' | 'Pass';

const normalizeAction = (value: unknown): AdminAction | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'allow') return 'Allow';
  if (normalized === 'deny') return 'Deny';
  if (normalized === 'pass') return 'Pass';
  return undefined;
};

const toLabelSelector = (value: unknown): LabelSelector => {
  if (!value || typeof value !== 'object') return {};
  const selector: LabelSelector = {};
  const record = value as Record<string, unknown>;

  if (record.matchLabels && typeof record.matchLabels === 'object') {
    const labels: Record<string, string> = {};
    Object.entries(record.matchLabels as Record<string, unknown>).forEach(([key, val]) => {
      if (val === undefined || val === null) return;
      labels[key] = String(val);
    });
    selector.matchLabels = labels;
  }

  if (Array.isArray(record.matchExpressions)) {
    const expressions = record.matchExpressions
      .map(expr => {
        if (!expr || typeof expr !== 'object') return null;
        const exp = expr as Record<string, unknown>;
        if (typeof exp.key !== 'string' || typeof exp.operator !== 'string') return null;
        const values = Array.isArray(exp.values) ? exp.values.map(v => String(v)) : undefined;
        return { key: exp.key, operator: exp.operator, values };
      })
      .filter((exp): exp is NonNullable<typeof exp> => Boolean(exp));

    if (expressions.length > 0) {
      selector.matchExpressions = expressions;
    }
  }

  return selector;
};

const normalizeNetworkPolicyPort = (value: unknown): NetworkPolicyPort => {
  if (!value || typeof value !== 'object') return {};
  const port = value as Record<string, unknown>;
  const normalized: NetworkPolicyPort = {};

  if (port.protocol) normalized.protocol = String(port.protocol);

  if (port.port !== undefined && port.port !== null) {
    normalized.port = typeof port.port === 'number' ? port.port : Number.isNaN(Number(port.port)) ? String(port.port) : Number(port.port);
  }

  if (typeof port.endPort === 'number') {
    normalized.endPort = port.endPort;
  }

  return normalized;
};

const normalizeNetworkPolicyPeer = (value: unknown): NetworkPolicyPeer => {
  if (!value || typeof value !== 'object') return {};
  const peer = value as Record<string, unknown>;
  const normalized: NetworkPolicyPeer = {};

  if (peer.podSelector) {
    normalized.podSelector = toLabelSelector(peer.podSelector);
  }

  if (peer.namespaceSelector) {
    normalized.namespaceSelector = toLabelSelector(peer.namespaceSelector);
  }

  if (peer.ipBlock && typeof peer.ipBlock === 'object') {
    const ipBlock = peer.ipBlock as Record<string, unknown>;
    if (typeof ipBlock.cidr === 'string') {
      normalized.ipBlock = {
        cidr: ipBlock.cidr,
        except: Array.isArray(ipBlock.except) ? ipBlock.except.map(item => String(item)) : undefined,
      };
    }
  }

  return normalized;
};

const normalizeAdminPort = (value: unknown): AdminNetworkPolicyPort => {
  if (!value || typeof value !== 'object') return {};
  const port = value as Record<string, unknown>;
  const normalized: AdminNetworkPolicyPort = {};

  if (port.portNumber && typeof port.portNumber === 'object') {
    const portNumber = port.portNumber as Record<string, unknown>;
    if (typeof portNumber.protocol === 'string' && portNumber.port !== undefined && portNumber.port !== null) {
      normalized.portNumber = {
        protocol: portNumber.protocol,
        port: typeof portNumber.port === 'number' ? portNumber.port : Number(portNumber.port),
      };
    }
  }

  if (port.namedPort && typeof port.namedPort === 'string') {
    normalized.namedPort = port.namedPort;
  }

  if (port.portRange && typeof port.portRange === 'object') {
    const range = port.portRange as Record<string, unknown>;
    if (
      typeof range.protocol === 'string' &&
      range.start !== undefined &&
      range.end !== undefined &&
      !Number.isNaN(Number(range.start)) &&
      !Number.isNaN(Number(range.end))
    ) {
      normalized.portRange = {
        protocol: range.protocol,
        start: typeof range.start === 'number' ? range.start : Number(range.start),
        end: typeof range.end === 'number' ? range.end : Number(range.end),
      };
    }
  }

  return normalized;
};

const normalizeAdminPeer = (value: unknown): AdminNetworkPolicyPeer => {
  if (!value || typeof value !== 'object') return {};
  const peer = value as Record<string, unknown>;
  const normalized: AdminNetworkPolicyPeer = {};

  if (peer.namespaces) {
    normalized.namespaces = toLabelSelector(peer.namespaces);
  }

  if (peer.pods && typeof peer.pods === 'object') {
    const pods = peer.pods as Record<string, unknown>;
    normalized.pods = {
      namespaceSelector: toLabelSelector(pods.namespaceSelector),
      podSelector: toLabelSelector(pods.podSelector),
    };
  }

  return normalized;
};

const normalizeNetworkPolicy = (doc: Record<string, unknown>): NetworkPolicy | null => {
  if (typeof doc.metadata !== 'object' || !doc.metadata) return null;
  const metadata = doc.metadata as Record<string, unknown>;
  if (typeof metadata.name !== 'string') return null;
  const spec = (doc.spec ?? {}) as Record<string, unknown>;

  const ingress = Array.isArray(spec.ingress)
    ? spec.ingress.map(rule => {
        const normalizedRule = rule as Record<string, unknown>;
        return {
          from: Array.isArray(normalizedRule.from)
            ? normalizedRule.from.map(normalizeNetworkPolicyPeer).filter(peer => Object.keys(peer).length > 0)
            : undefined,
          ports: Array.isArray(normalizedRule.ports)
            ? normalizedRule.ports.map(normalizeNetworkPolicyPort).filter(port => Object.keys(port).length > 0)
            : undefined,
        };
      })
    : undefined;

  const egress = Array.isArray(spec.egress)
    ? spec.egress.map(rule => {
        const normalizedRule = rule as Record<string, unknown>;
        return {
          to: Array.isArray(normalizedRule.to)
            ? normalizedRule.to.map(normalizeNetworkPolicyPeer).filter(peer => Object.keys(peer).length > 0)
            : undefined,
          ports: Array.isArray(normalizedRule.ports)
            ? normalizedRule.ports.map(normalizeNetworkPolicyPort).filter(port => Object.keys(port).length > 0)
            : undefined,
        };
      })
    : undefined;

  const policy: NetworkPolicy = {
    apiVersion: typeof doc.apiVersion === 'string' ? doc.apiVersion : '',
    kind: 'NetworkPolicy',
    metadata: {
      name: metadata.name,
      namespace: typeof metadata.namespace === 'string' ? metadata.namespace : undefined,
      labels: typeof metadata.labels === 'object' ? (metadata.labels as Record<string, string>) : undefined,
    },
    spec: {
      podSelector: toLabelSelector(spec.podSelector),
      policyTypes: Array.isArray(spec.policyTypes) ? spec.policyTypes.map(entry => String(entry)) : undefined,
      ingress,
      egress,
    },
  };

  return policy;
};

const normalizeAdminNetworkPolicy = (doc: Record<string, unknown>): AdminNetworkPolicy | null => {
  if (typeof doc.metadata !== 'object' || !doc.metadata) return null;
  const metadata = doc.metadata as Record<string, unknown>;
  if (typeof metadata.name !== 'string') return null;
  const spec = (doc.spec ?? {}) as Record<string, unknown>;

  const subjectRaw = (spec.subject ?? {}) as Record<string, unknown>;
  const subject = {
    namespaces: subjectRaw.namespaces ? toLabelSelector(subjectRaw.namespaces) : undefined,
    pods: subjectRaw.pods && typeof subjectRaw.pods === 'object'
      ? {
          namespaceSelector: toLabelSelector((subjectRaw.pods as Record<string, unknown>).namespaceSelector),
          podSelector: toLabelSelector((subjectRaw.pods as Record<string, unknown>).podSelector),
        }
      : undefined,
  };

  if (!subject.namespaces && !subject.pods) {
    subject.namespaces = {};
  }

  const ingress = Array.isArray(spec.ingress)
    ? spec.ingress
        .map(rule => {
          if (!rule || typeof rule !== 'object') return null;
          const ingressRule = rule as Record<string, unknown>;
          const action = normalizeAction(ingressRule.action);
          const from = Array.isArray(ingressRule.from)
            ? ingressRule.from.map(normalizeAdminPeer).filter(peer => Object.keys(peer).length > 0)
            : [];

          if (!action || from.length === 0) return null;

          return {
            name: typeof ingressRule.name === 'string' ? ingressRule.name : undefined,
            action,
            from,
            ports: Array.isArray(ingressRule.ports)
              ? ingressRule.ports.map(normalizeAdminPort).filter(port => Object.keys(port).length > 0)
              : undefined,
          };
        })
        .filter((rule): rule is NonNullable<typeof rule> => Boolean(rule))
    : undefined;

  const egress = Array.isArray(spec.egress)
    ? spec.egress
        .map(rule => {
          if (!rule || typeof rule !== 'object') return null;
          const egressRule = rule as Record<string, unknown>;
          const action = normalizeAction(egressRule.action);
          const to = Array.isArray(egressRule.to)
            ? egressRule.to.map(normalizeAdminPeer).filter(peer => Object.keys(peer).length > 0)
            : [];

          if (!action || to.length === 0) return null;

          return {
            name: typeof egressRule.name === 'string' ? egressRule.name : undefined,
            action,
            to,
            ports: Array.isArray(egressRule.ports)
              ? egressRule.ports.map(normalizeAdminPort).filter(port => Object.keys(port).length > 0)
              : undefined,
          };
        })
        .filter((rule): rule is NonNullable<typeof rule> => Boolean(rule))
    : undefined;

  const priorityValue = spec.priority;
  const priority = typeof priorityValue === 'number' ? priorityValue : Number(priorityValue ?? 0);

  const policy: AdminNetworkPolicy = {
    apiVersion: typeof doc.apiVersion === 'string' ? doc.apiVersion : '',
    kind: 'AdminNetworkPolicy',
    metadata: {
      name: metadata.name,
    },
    spec: {
      priority: Number.isNaN(priority) ? 0 : priority,
      subject,
      ingress,
      egress,
    },
  };

  return policy;
};

const normalizeBaseAdminNetworkPolicy = (doc: Record<string, unknown>): BaseAdminNetworkPolicy | null => {
  if (typeof doc.metadata !== 'object' || !doc.metadata) return null;
  const metadata = doc.metadata as Record<string, unknown>;
  if (typeof metadata.name !== 'string') return null;
  const spec = (doc.spec ?? {}) as Record<string, unknown>;

  const subject = {
    namespaceSelector: spec.subject && typeof spec.subject === 'object' ? toLabelSelector((spec.subject as Record<string, unknown>).namespaceSelector) : undefined,
    podSelector: spec.subject && typeof spec.subject === 'object' ? toLabelSelector((spec.subject as Record<string, unknown>).podSelector) : undefined,
  };

  if (!subject.namespaceSelector && !subject.podSelector) {
    subject.namespaceSelector = {};
  }

  const ingress = Array.isArray(spec.ingress)
    ? spec.ingress
        .map(rule => {
          if (!rule || typeof rule !== 'object') return null;
          const ingressRule = rule as Record<string, unknown>;
          const action = normalizeAction(ingressRule.action);
          const from = Array.isArray(ingressRule.from)
            ? ingressRule.from.map(normalizeAdminPeer).filter(peer => Object.keys(peer).length > 0)
            : [];

          if (!action || from.length === 0) return null;

          return {
            name: typeof ingressRule.name === 'string' ? ingressRule.name : undefined,
            action,
            from,
            ports: Array.isArray(ingressRule.ports)
              ? ingressRule.ports.map(normalizeAdminPort).filter(port => Object.keys(port).length > 0)
              : undefined,
          };
        })
        .filter((rule): rule is NonNullable<typeof rule> => Boolean(rule))
    : undefined;

  const egress = Array.isArray(spec.egress)
    ? spec.egress
        .map(rule => {
          if (!rule || typeof rule !== 'object') return null;
          const egressRule = rule as Record<string, unknown>;
          const action = normalizeAction(egressRule.action);
          const to = Array.isArray(egressRule.to)
            ? egressRule.to.map(normalizeAdminPeer).filter(peer => Object.keys(peer).length > 0)
            : [];

          if (!action || to.length === 0) return null;

          return {
            name: typeof egressRule.name === 'string' ? egressRule.name : undefined,
            action,
            to,
            ports: Array.isArray(egressRule.ports)
              ? egressRule.ports.map(normalizeAdminPort).filter(port => Object.keys(port).length > 0)
              : undefined,
          };
        })
        .filter((rule): rule is NonNullable<typeof rule> => Boolean(rule))
    : undefined;

  const policy: BaseAdminNetworkPolicy = {
    apiVersion: typeof doc.apiVersion === 'string' ? doc.apiVersion : '',
    kind: 'BaseAdminNetworkPolicy',
    metadata: {
      name: metadata.name,
    },
    spec: {
      subject,
      ingress,
      egress,
    },
  };

  return policy;
};

const parsePolicies = (input: string): Policy[] => {
  if (!input.trim()) return [];

  const rawDocs: Array<Record<string, unknown>> = [];
  loadAll(input, (doc: unknown) => {
    if (doc && typeof doc === 'object') {
      rawDocs.push(doc as Record<string, unknown>);
    }
  });

  const policies = rawDocs
    .map(doc => {
      switch (doc.kind) {
        case 'NetworkPolicy':
          return normalizeNetworkPolicy(doc);
        case 'AdminNetworkPolicy':
          return normalizeAdminNetworkPolicy(doc);
        case 'BaseAdminNetworkPolicy':
          return normalizeBaseAdminNetworkPolicy(doc);
        default:
          return null;
      }
    })
    .filter((policy): policy is Policy => Boolean(policy));

  return policies;
};

const PolicyEditor = ({ onPoliciesChange }: PolicyEditorProps) => {
  const [yamlInput, setYamlInput] = useState<string>('');
  const [error, setError] = useState<string>('');

  const examplePolicies = `# Example Network Policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-allow
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
---
# Example Admin Network Policy
apiVersion: policy.networking.k8s.io/v1alpha1
kind: AdminNetworkPolicy
metadata:
  name: cluster-network-policy
spec:
  priority: 50
  subject:
    namespaces:
      matchLabels:
        environment: production
  ingress:
  - name: allow-from-monitoring
    action: Allow
    from:
    - namespaces:
        matchLabels:
          app: monitoring
  egress:
  - name: deny-internet
    action: Deny
    to:
    - namespaces:
        matchLabels:
          external: "true"
`;

  const handleLoadExample = () => {
    setYamlInput(examplePolicies);
    setError('');
  };

  const handleParse = () => {
    try {
      setError('');
      const policies = parsePolicies(yamlInput);

      if (policies.length === 0) {
        onPoliciesChange([]);
        setError('No valid policies found. Please check your YAML format.');
        return;
      }

      onPoliciesChange(policies);
    } catch (e) {
      onPoliciesChange([]);
      setError(`Error parsing policies: ${(e as Error).message}`);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      borderRight: '2px solid #ddd',
    }}>
      <h2 style={{ marginBottom: '10px', color: '#333' }}>Policy Editor</h2>
      <textarea
        value={yamlInput}
        onChange={(e) => setYamlInput(e.target.value)}
        placeholder="Enter Kubernetes Network Policy YAML here..."
        style={{
          flex: 1,
          marginBottom: '10px',
          padding: '10px',
          fontFamily: 'monospace',
          fontSize: '12px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          resize: 'none',
        }}
      />
      {error && (
        <div style={{
          padding: '10px',
          marginBottom: '10px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
          fontSize: '12px',
        }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleLoadExample}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#4A90E2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          Load Example
        </button>
        <button
          onClick={handleParse}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#7ED321',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          Visualize
        </button>
      </div>
    </div>
  );
};

export default PolicyEditor;
