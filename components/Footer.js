// Footer component
export function Footer() {
    return React.createElement('div', { className: 'footer' },
        React.createElement('div', null,
            'Created by ',
            React.createElement('a',
                { href: 'https://bsky.app/profile/felixmil.com', target: '_blank', rel: 'noopener noreferrer' },
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
                    style: { display: 'inline-flex', alignItems: 'center' }
                },
                React.createElement('i', {
                    className: 'bi bi-github',
                    style: { color: '#24292e', fontSize: '1.35rem', verticalAlign: 'middle' }
                })
            )
        )
    );
} 