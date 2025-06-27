// Tab bar component for navigation
export function TabBar({ activeTab, onTabChange }) {
    const tabs = [
        { id: 'log', label: 'Log', tooltip: 'Manage your time entries' },
        { id: 'report', label: 'Report', tooltip: 'View time reports and statistics' }
    ];

    return React.createElement('div', { className: 'tab-bar' },
        tabs.map(tab =>
            React.createElement('div', {
                key: tab.id,
                className: 'tab-btn' + (activeTab === tab.id ? ' active' : ''),
                onClick: () => onTabChange(tab.id),
                'data-tooltip': tab.tooltip
            }, tab.label)
        )
    );
} 