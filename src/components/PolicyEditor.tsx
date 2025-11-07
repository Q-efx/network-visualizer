import { useState } from 'react';
import { Policy } from '../types/policies';

interface PolicyEditorProps {
  onPoliciesChange: (policies: Policy[]) => void;
}

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
      // Simple YAML-like parsing (in production, use a proper YAML parser)
      const docs = yamlInput.split('---').filter(doc => doc.trim());
      const policies: Policy[] = [];

      docs.forEach(doc => {
        try {
          // Extract fields using regex (simplified approach)
          const kindMatch = doc.match(/kind:\s*(\w+)/);
          const apiVersionMatch = doc.match(/apiVersion:\s*([^\n]+)/);
          const nameMatch = doc.match(/name:\s*([^\n]+)/);
          
          if (!kindMatch || !apiVersionMatch || !nameMatch) {
            return;
          }

          const kind = kindMatch[1].trim();
          const apiVersion = apiVersionMatch[1].trim();
          const name = nameMatch[1].trim();

          if (kind === 'NetworkPolicy') {
            const namespaceMatch = doc.match(/namespace:\s*([^\n]+)/);
            const namespace = namespaceMatch ? namespaceMatch[1].trim() : 'default';

            const policy: Policy = {
              apiVersion,
              kind: 'NetworkPolicy',
              metadata: { name, namespace },
              spec: {
                podSelector: { matchLabels: {} },
                policyTypes: ['Ingress', 'Egress'],
                ingress: [],
                egress: [],
              },
            };
            policies.push(policy);
          } else if (kind === 'AdminNetworkPolicy') {
            const policy: Policy = {
              apiVersion,
              kind: 'AdminNetworkPolicy',
              metadata: { name },
              spec: {
                priority: 50,
                subject: { namespaces: { matchLabels: {} } },
                ingress: [],
                egress: [],
              },
            };
            policies.push(policy);
          } else if (kind === 'BaseAdminNetworkPolicy') {
            const policy: Policy = {
              apiVersion,
              kind: 'BaseAdminNetworkPolicy',
              metadata: { name },
              spec: {
                subject: { namespaceSelector: { matchLabels: {} } },
                ingress: [],
                egress: [],
              },
            };
            policies.push(policy);
          }
        } catch (e) {
          // Skip invalid documents
          console.error('Error parsing document:', e);
        }
      });

      if (policies.length === 0) {
        setError('No valid policies found. Please check your YAML format.');
      } else {
        onPoliciesChange(policies);
      }
    } catch (e) {
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
