// Demo banner components
export function DemoBanner({ onEnterDemo }) {
    return React.createElement('div', {
        style: {
            background: '#e0e7ef',
            border: '1.5px solid #2563eb',
            color: '#1e293b',
            borderRadius: 8,
            padding: '14px 18px',
            marginBottom: 18,
            fontSize: '1rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16
        }
    },
        React.createElement('span', null, 'Try the demo version with example data!'),
        React.createElement('button', {
            className: 'btn btn-green',
            onClick: onEnterDemo,
            style: { marginLeft: 8 }
        }, 'Load Demo')
    );
}

export function DemoModeBanner({ onExitDemo }) {
    return React.createElement('div', {
        style: {
            background: '#fffbe6',
            border: '1.5px solid #facc15',
            color: '#b45309',
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 18,
            fontSize: '0.98rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16
        }
    },
        React.createElement('span', null, 'You are in demo mode. '),
        React.createElement('button', {
            className: 'btn',
            onClick: onExitDemo,
            style: { marginLeft: 8 }
        }, 'Exit Demo Mode')
    );
} 