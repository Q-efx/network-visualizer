const Legend = () => {
  const items = [
    { color: '#4A90E2', label: 'Namespace', shape: 'rect' },
    { color: '#7ED321', label: 'Pod', shape: 'circle' },
    { color: '#F5A623', label: 'External', shape: 'circle' },
  ];

  const edgeItems = [
    { color: '#4A90E2', label: 'Ingress', style: 'solid' },
    { color: '#BD10E0', label: 'Egress', style: 'dashed' },
    { color: '#7ED321', label: 'Allow', style: 'solid' },
    { color: '#D0021B', label: 'Deny', style: 'solid' },
    { color: '#F8E71C', label: 'Pass', style: 'solid' },
  ];

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      backgroundColor: 'white',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      minWidth: '180px',
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>Legend</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666' }}>Nodes</h4>
        {items.map((item, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '6px',
          }}>
            {item.shape === 'rect' ? (
              <div style={{
                width: '20px',
                height: '12px',
                backgroundColor: item.color,
                border: '1px solid #000',
                borderRadius: '2px',
                marginRight: '8px',
              }} />
            ) : (
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: item.color,
                border: '1px solid #000',
                borderRadius: '50%',
                marginRight: '8px',
              }} />
            )}
            <span style={{ fontSize: '12px' }}>{item.label}</span>
          </div>
        ))}
      </div>

      <div>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666' }}>Edges</h4>
        {edgeItems.map((item, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '6px',
          }}>
            <div style={{
              width: '24px',
              height: '2px',
              marginRight: '8px',
              borderTop: item.style === 'dashed' ? `2px dashed ${item.color}` : 'none',
              backgroundColor: item.style === 'dashed' ? 'transparent' : item.color,
            }} />
            <span style={{ fontSize: '12px' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Legend;
