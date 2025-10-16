// Header component with menu and info button
const { useState, useRef } = React;

export function Header({
    onExportJSON,
    onImportJSON,
    onExportCSV,
    onToggleInfo
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const fileInputRef = useRef();

    const toggleMenu = () => setMenuOpen(open => !open);
    const closeMenu = () => setMenuOpen(false);

    const menuSection = React.createElement('div', { className: 'menu-section' },
        React.createElement('div', {
            className: menuOpen ? 'burger-menu open' : 'burger-menu',
            tabIndex: 0,
            onBlur: () => setTimeout(closeMenu, 120)
        },
            React.createElement('button', {
                className: 'burger-icon',
                onClick: toggleMenu,
                'aria-label': 'Open menu',
                'data-tooltip': 'Export/Import options',
                type: 'button'
            },
                React.createElement('span'),
                React.createElement('span'),
                React.createElement('span')
            ),
            React.createElement('div', { className: 'burger-dropdown' },
                React.createElement('button', {
                    onClick: () => { onExportJSON(); closeMenu(); },
                    'data-tooltip': 'Save time data as JSON file'
                }, 'Export JSON'),
                React.createElement('button', {
                    'data-tooltip': 'Load time data from JSON file',
                    onClick: () => fileInputRef.current.click()
                },
                    'Import JSON',
                    React.createElement('input', {
                        type: 'file',
                        accept: '.json,application/json',
                        style: { display: 'none' },
                        ref: fileInputRef,
                        onChange: e => { onImportJSON(e); closeMenu(); }
                    })
                ),
                React.createElement('button', {
                    onClick: () => { onExportCSV(); closeMenu(); },
                    'data-tooltip': 'Export time data as CSV file'
                }, 'Export CSV')
            )
        )
    );


    return React.createElement('div', { className: 'header-row' },
        menuSection,
        React.createElement('h1', { className: 'app-title' }, "Felix's Minimal Time Logger"),
        React.createElement('button', {
            className: 'btn info-btn',
            onClick: onToggleInfo,
            'aria-label': 'Show app information',
            'data-tooltip': 'About this app',
            type: 'button'
        }, React.createElement('i', { className: 'bi bi-info-circle', style: { fontSize: '20px', color: '#374151' } }))
    );
} 