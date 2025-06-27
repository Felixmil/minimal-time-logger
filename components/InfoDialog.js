// Info dialog component
export function InfoDialog({ isOpen, onClose }) {
    if (!isOpen) return null;

    return React.createElement('div', {
        className: 'modal-overlay',
        onClick: onClose,
        style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
        }
    },
        React.createElement('div', {
            className: 'info-dialog',
            onClick: (e) => e.stopPropagation(),
            style: {
                background: '#ffffff',
                border: '1.5px solid #94a3b8',
                borderRadius: 10,
                padding: '24px 28px',
                position: 'relative',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                maxWidth: '550px',
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto'
            }
        },
            React.createElement('button', {
                className: 'close-info-btn',
                onClick: onClose,
                'aria-label': 'Close information',
                style: {
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '20px',
                    padding: 4,
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }
            }, React.createElement('i', { className: 'bi bi-x', style: { fontSize: '24px', color: '#334155' } })),
            React.createElement('h2', { style: { margin: '0 0 16px 0', color: '#334155', fontSize: '1.4rem', fontWeight: '600' } }, "About Felix's Minimal Time Logger"),
            React.createElement('div', { style: { fontSize: '1rem', lineHeight: '1.6', color: '#475569' } },
                React.createElement('p', { style: { marginTop: 0 } }, "This is a minimalist time tracking application designed for simple group time management. Track work hours across different groups with a clean, distraction-free interface."),
                React.createElement('p', { style: { fontWeight: '500', marginBottom: '6px' } }, "✨ How to use:"),
                React.createElement('ul', { style: { paddingLeft: 22, margin: '8px 0 16px 0', listStyleType: 'none' } },
                    React.createElement('li', { style: { marginBottom: '8px' } }, "1️⃣ Create a group using the 'Add' button"),
                    React.createElement('li', { style: { marginBottom: '8px' } }, "2️⃣ Track time by clicking the green play button ▶️"),
                    React.createElement('li', { style: { marginBottom: '8px' } }, "3️⃣ Add manual entries with the + button if needed"),
                    React.createElement('li', { style: { marginBottom: '8px' } }, "4️⃣ Switch to Report tab to see your time statistics 📊"),
                    React.createElement('li', { style: { marginBottom: '8px' } }, "5️⃣ Export your data using the menu ☰ in top-left")
                ),
                React.createElement('div', {
                    style: {
                        marginTop: 24,
                        paddingTop: 16,
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.95rem',
                        color: '#64748b'
                    }
                },
                    'Created by ',
                    React.createElement('a',
                        {
                            href: 'https://bsky.app/profile/felixmil.com',
                            target: '_blank',
                            rel: 'noopener noreferrer',
                            style: {
                                color: '#2563eb',
                                textDecoration: 'none',
                                margin: '0 4px'
                            }
                        },
                        'Felix MIL ',
                        React.createElement('i', {
                            className: 'bi bi-bluesky',
                            style: { color: '#0085ff', fontSize: '1.25rem', verticalAlign: 'middle' }
                        })
                    ),
                    ' | ',
                    React.createElement('a',
                        {
                            href: 'https://github.com/Felixmil/minimal-time-logger',
                            target: '_blank',
                            rel: 'noopener noreferrer',
                            title: 'GitHub Repository',
                            style: {
                                display: 'inline-flex',
                                alignItems: 'center',
                                color: '#2563eb',
                                textDecoration: 'none',
                                margin: '0 4px'
                            }
                        },
                        React.createElement('i', {
                            className: 'bi bi-github',
                            style: { color: '#24292e', fontSize: '1.35rem', verticalAlign: 'middle' }
                        })
                    )
                )
            )
        )
    );
} 