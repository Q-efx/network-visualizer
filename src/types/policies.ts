// Kubernetes Network Policy types

export interface LabelSelector {
  matchLabels?: { [key: string]: string };
  matchExpressions?: Array<{
    key: string;
    operator: string;
    values?: string[];
  }>;
}

export interface NetworkPolicyPort {
  protocol?: string;
  port?: number | string;
  endPort?: number;
}

export interface NetworkPolicyPeer {
  podSelector?: LabelSelector;
  namespaceSelector?: LabelSelector;
  ipBlock?: {
    cidr: string;
    except?: string[];
  };
}

export interface NetworkPolicyIngressRule {
  from?: NetworkPolicyPeer[];
  ports?: NetworkPolicyPort[];
}

export interface NetworkPolicyEgressRule {
  to?: NetworkPolicyPeer[];
  ports?: NetworkPolicyPort[];
}

export interface NetworkPolicy {
  apiVersion: string;
  kind: 'NetworkPolicy';
  metadata: {
    name: string;
    namespace: string;
    labels?: { [key: string]: string };
  };
  spec: {
    podSelector: LabelSelector;
    policyTypes?: string[];
    ingress?: NetworkPolicyIngressRule[];
    egress?: NetworkPolicyEgressRule[];
  };
}

// Admin Network Policy types
export interface AdminNetworkPolicyPeer {
  namespaces?: LabelSelector;
  pods?: {
    namespaceSelector: LabelSelector;
    podSelector: LabelSelector;
  };
}

export interface AdminNetworkPolicyPort {
  portNumber?: {
    protocol: string;
    port: number;
  };
  namedPort?: string;
  portRange?: {
    protocol: string;
    start: number;
    end: number;
  };
}

export interface AdminNetworkPolicyIngressRule {
  name?: string;
  action: 'Allow' | 'Deny' | 'Pass';
  from: AdminNetworkPolicyPeer[];
  ports?: AdminNetworkPolicyPort[];
}

export interface AdminNetworkPolicyEgressRule {
  name?: string;
  action: 'Allow' | 'Deny' | 'Pass';
  to: AdminNetworkPolicyPeer[];
  ports?: AdminNetworkPolicyPort[];
}

export interface AdminNetworkPolicy {
  apiVersion: string;
  kind: 'AdminNetworkPolicy';
  metadata: {
    name: string;
  };
  spec: {
    priority: number;
    subject: {
      namespaces?: LabelSelector;
      pods?: {
        namespaceSelector: LabelSelector;
        podSelector: LabelSelector;
      };
    };
    ingress?: AdminNetworkPolicyIngressRule[];
    egress?: AdminNetworkPolicyEgressRule[];
  };
}

// Base Admin Network Policy types
export interface BaseAdminNetworkPolicy {
  apiVersion: string;
  kind: 'BaseAdminNetworkPolicy';
  metadata: {
    name: string;
  };
  spec: {
    subject: {
      namespaceSelector?: LabelSelector;
      podSelector?: LabelSelector;
    };
    ingress?: AdminNetworkPolicyIngressRule[];
    egress?: AdminNetworkPolicyEgressRule[];
  };
}

export type Policy = NetworkPolicy | AdminNetworkPolicy | BaseAdminNetworkPolicy;
