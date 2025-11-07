import { useState, useEffect } from 'react';
import PolicyEditor from './components/PolicyEditor';
import CanvasVisualizer from './components/CanvasVisualizer';
import Legend from './components/Legend';
import { Policy } from './types/policies';
import { extractVisualizationData, VisualizationData } from './utils/policyParser';
import './App.css';

function App() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [vizData, setVizData] = useState<VisualizationData>({ nodes: [], edges: [] });
  const [canvasWidth, setCanvasWidth] = useState(window.innerWidth * 0.7);
  const [canvasHeight, setCanvasHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setCanvasWidth(window.innerWidth * 0.7);
      setCanvasHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePoliciesChange = (newPolicies: Policy[]) => {
    setPolicies(newPolicies);
    const data = extractVisualizationData(newPolicies);
    setVizData(data);
  };

  return (
    <div className="app">
      <div className="editor-panel">
        <PolicyEditor onPoliciesChange={handlePoliciesChange} />
      </div>
      <div className="visualizer-panel">
        <div className="header">
          <h1>Kubernetes Network Policy Visualizer</h1>
          <p>Visualize Network Policies, Admin Network Policies, and Base Admin Network Policies</p>
        </div>
        <div className="canvas-container">
          <CanvasVisualizer
            nodes={vizData.nodes}
            edges={vizData.edges}
            width={canvasWidth}
            height={canvasHeight - 100}
          />
          <Legend />
        </div>
        <div className="info-panel">
          <div className="stat">
            <strong>Policies:</strong> {policies.length}
          </div>
          <div className="stat">
            <strong>Nodes:</strong> {vizData.nodes.length}
          </div>
          <div className="stat">
            <strong>Connections:</strong> {vizData.edges.length}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
