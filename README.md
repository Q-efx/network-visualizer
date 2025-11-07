# Kubernetes Network Policy Visualizer

A visual tool for Kubernetes network policies that uses a Canvas draw board to visualize and edit network policies, admin network policies, and base admin network policies in an interactive GUI.

## Features

- **Visual Representation**: Canvas-based visualization of Kubernetes network policies
- **Multiple Policy Types**: Support for:
  - NetworkPolicy
  - AdminNetworkPolicy
  - BaseAdminNetworkPolicy
- **Interactive Visualization**: 
  - Visualize relationships between namespaces, pods, and network rules
  - Ingress and egress traffic flow visualization
  - Drag and drop nodes for better layout
- **Policy Editor**: Built-in YAML editor for creating and editing policies
- **Real-time Updates**: Instant visualization as policies are loaded

## Visualization Elements

### Nodes
- **Namespaces** (Blue rectangles): Kubernetes namespace selectors
- **Pods** (Green circles): Pod selectors based on labels
- **External** (Orange circles): External IP blocks or any traffic

### Edges
- **Ingress** (Solid blue arrows): Incoming traffic rules
- **Egress** (Dashed purple arrows): Outgoing traffic rules
- **Allow** (Green): Allowed traffic (Admin policies)
- **Deny** (Red): Denied traffic (Admin policies)
- **Pass** (Yellow): Pass traffic to next policy (Admin policies)

## Installation

```bash
npm install
```

## Usage

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Lint
```bash
npm run lint
```

## How to Use

1. **Load Example**: Click "Load Example" to see sample policies
2. **Edit Policies**: Write or paste your Kubernetes network policy YAML in the editor
3. **Visualize**: Click "Visualize" to render the policies on the canvas
4. **Interact**: Drag nodes to rearrange the visualization layout

## Example Policy

```yaml
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
```

## Technology Stack

- **React 18**: UI framework
- **TypeScript**: Type-safe development
- **Konva & React-Konva**: Canvas rendering library
- **Vite**: Build tool and dev server

## Project Structure

```
network-visualizer/
├── src/
│   ├── components/
│   │   ├── CanvasVisualizer.tsx  # Canvas drawing component
│   │   ├── PolicyEditor.tsx      # YAML editor component
│   │   └── Legend.tsx             # Legend component
│   ├── types/
│   │   └── policies.ts            # TypeScript type definitions
│   ├── utils/
│   │   └── policyParser.ts        # Policy parsing logic
│   ├── App.tsx                    # Main application
│   ├── App.css                    # Application styles
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## License

MIT