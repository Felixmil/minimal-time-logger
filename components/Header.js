// Header component with menu and info button
const { useState, useRef } = React;
import { AuthButton } from './AuthButton.js';

export function Header({
    onExportJSON,
    onImportJSON,
    onExportCSV,
    onToggleInfo,
    user,
    onSignIn,
    onSignOut,
    authLoading,
    onClearCloudData
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
                user && React.createElement('button', {
                    onClick: async () => {
                        if (confirm('Are you sure you want to clear all data (both cloud and local)? This action cannot be undone.')) {
                            await onClearCloudData();
                            closeMenu();
                        }
                    },
                    'data-tooltip': 'Delete all data from cloud storage and local storage',
                    style: { color: '#dc3545' }
                }, 'Clear All Data')
            )
        )
    );


    return React.createElement('div', { className: 'header-container' },
        // First row: Burger menu and Sign-in button
        React.createElement('div', { className: 'header-row header-top' },
            menuSection,
            React.createElement('div', { className: 'header-actions' },
                React.createElement(AuthButton, {
                    user,
                    onSignIn,
                    onSignOut,
                    loading: authLoading
                })
            )
        ),
        // Second row: App title and Info button
        React.createElement('div', { className: 'header-row header-bottom' },
            React.createElement('div', { className: 'title-section' },
                React.createElement('h1', { className: 'app-title' }, "Felix's Minimal Time Logger"),
                React.createElement('button', {
                    className: 'btn info-btn',
                    onClick: onToggleInfo,
                    'aria-label': 'Show app information',
                    type: 'button'
                }, React.createElement('i', { className: 'bi bi-info-circle', style: { fontSize: '20px', color: '#374151' } }))
            )
        )
    );
} 