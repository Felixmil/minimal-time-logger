// Report tab component with charts and export functionality
const { useState, useEffect, useRef } = React;
import { formatDurationHM, getMonthData } from './utils.js';

export function ReportTab({
    groups,
    selectedGroups,
    onSelectedGroupsChange,
    reportMonth,
    onReportMonthChange,
    onExportPDF,
    onExportReportCSV
}) {
    const daysChartRef = useRef();
    const groupsChartRef = useRef();

    const activeGroups = groups.filter(g => !g.archived);
    const monthData = getMonthData(groups, selectedGroups, reportMonth);

    const changeMonth = (offset) => {
        const [year, month] = reportMonth.split('-').map(Number);
        const newDate = new Date(year, month - 1 + offset, 1);
        const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
        onReportMonthChange(newMonth);
    };

    // Render charts when data changes
    useEffect(() => {
        const daysCtx = document.getElementById('days-bar-chart');
        const groupsCtx = document.getElementById('groups-bar-chart');
        if (!daysCtx || !groupsCtx) return;

        if (daysChartRef.current) daysChartRef.current.destroy();
        if (groupsChartRef.current) groupsChartRef.current.destroy();

        const days = monthData.days;
        const dayLabels = Object.keys(days).sort();
        const dayData = dayLabels.map(d => +(days[d] / 3600).toFixed(2)); // hours
        const formattedDayLabels = dayLabels.map(d => parseInt(d.split('-')[2], 10));

        // Days chart
        daysChartRef.current = new window.Chart(daysCtx, {
            type: 'bar',
            data: {
                labels: formattedDayLabels,
                datasets: [{
                    label: 'Hours per day',
                    data: dayData,
                    backgroundColor: '#2563eb',
                    borderRadius: 6,
                }]
            },
            options: {
                layout: { padding: { top: 32 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            title: (tooltipItems) => {
                                const idx = tooltipItems[0].dataIndex;
                                return dayLabels[idx];
                            }
                        }
                    },
                    datalabels: {
                        display: function (context) {
                            return context.dataset.data[context.dataIndex] > 0;
                        },
                        color: '#222',
                        anchor: 'end',
                        align: 'end',
                        font: { weight: 'bold' },
                        formatter: (value) => value > 0 ? value + 'h' : ''
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Day' },
                        ticks: {
                            callback: function (value, index) {
                                return formattedDayLabels[index];
                            }
                        }
                    },
                    y: { title: { display: true, text: 'Hours' }, beginAtZero: true }
                },
                responsive: true,
                maintainAspectRatio: false,
            },
            plugins: window.ChartDataLabels ? [window.ChartDataLabels] : []
        });

        // Groups chart
        const groupTotals = monthData.groupTotals;
        let groupLabels = Object.keys(groupTotals);
        groupLabels = groupLabels.sort((a, b) => (groupTotals[b] || 0) - (groupTotals[a] || 0));
        const groupData = groupLabels.map(g => +(groupTotals[g] / 3600).toFixed(2)); // hours

        groupsChartRef.current = new window.Chart(groupsCtx, {
            type: 'bar',
            data: {
                labels: groupLabels,
                datasets: [{
                    label: 'Hours per group',
                    data: groupData,
                    backgroundColor: '#10b981',
                    borderRadius: 6,
                }]
            },
            options: {
                layout: { padding: { right: 48 } },
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false },
                    datalabels: {
                        display: true,
                        color: '#222',
                        anchor: 'end',
                        align: 'end',
                        font: { weight: 'bold' },
                        formatter: (value) => value + 'h'
                    }
                },
                scales: {
                    x: { title: { display: true, text: 'Hours' }, beginAtZero: true },
                    y: {
                        title: { display: true, text: 'Group' },
                        ticks: {
                            autoSkip: false,
                            maxRotation: 0,
                            callback: function (value, index) {
                                const label = this.getLabelForValue(value);
                                return label.length > 15 ? label.substring(0, 15) + '...' : label;
                            }
                        }
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
            },
            plugins: window.ChartDataLabels ? [window.ChartDataLabels] : []
        });
    }, [monthData, reportMonth]);

    return React.createElement('div', null,
        // Project multi-select UI
        React.createElement('div', { style: { marginBottom: 12 } },
            React.createElement('label', { style: { fontWeight: 500, display: 'block', marginBottom: 8, textAlign: 'center' } }, 'Select Groups:'),
            React.createElement('div', {
                style: {
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    justifyContent: 'center',
                    padding: '0 10px',
                    maxWidth: '90%',
                    margin: '0 auto'
                }
            },
                // "All" option
                React.createElement('div', {
                    className: (selectedGroups.length === 0 || (selectedGroups.length === 1 && selectedGroups[0] === 'all')
                        ? 'project-tag selected'
                        : 'project-tag') + ' tooltip-wide',
                    onClick: () => onSelectedGroupsChange(['all']),
                    'data-tooltip': 'Show data from all active groups'
                }, 'All groups'),

                // Individual project options sorted alphabetically
                [...activeGroups]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(g =>
                        React.createElement('div', {
                            key: g.name,
                            className: (selectedGroups.includes(g.name) ? 'project-tag selected' : 'project-tag') + ' tooltip-wide',
                            onClick: () => {
                                const currentSelected = selectedGroups.filter(proj => proj !== 'all');

                                if (currentSelected.includes(g.name)) {
                                    onSelectedGroupsChange(currentSelected.filter(proj => proj !== g.name));
                                } else {
                                    onSelectedGroupsChange([...currentSelected, g.name]);
                                }
                            },
                            'data-tooltip': selectedGroups.includes(g.name)
                                ? `Click to remove ${g.name} from selection`
                                : `Click to add ${g.name} to selection`
                        }, g.name)
                    )
            )
        ),

        // Month navigation
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 18 } },
            React.createElement('button', {
                className: 'btn tooltip-wide',
                onClick: () => changeMonth(-1),
                'data-tooltip': 'View previous month data'
            }, '\u25C0'),
            React.createElement('span', { style: { fontWeight: 500, fontSize: '1.1rem' } },
                new Date(reportMonth + '-01').toLocaleString(undefined, { month: 'long', year: 'numeric' })
            ),
            React.createElement('button', {
                className: 'btn tooltip-wide',
                onClick: () => changeMonth(1),
                'data-tooltip': 'View next month data'
            }, '\u25B6')
        ),

        // Indicators
        React.createElement('div', { style: { display: 'flex', gap: 32, justifyContent: 'center', marginBottom: 24 } },
            React.createElement('div', { style: { textAlign: 'center' } },
                React.createElement('div', { style: { fontSize: '2rem', fontWeight: 600 } },
                    formatDurationHM(monthData.totalSeconds)
                ),
                React.createElement('div', { style: { color: '#888', fontSize: '1rem' } }, 'Total time this month')
            ),
            React.createElement('div', { style: { textAlign: 'center' } },
                React.createElement('div', { style: { fontSize: '2rem', fontWeight: 600 } },
                    monthData.groupCount
                ),
                React.createElement('div', { style: { color: '#888', fontSize: '1rem' } }, 'Groups worked on')
            )
        ),

        // Charts
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center' } },
            React.createElement('div', { style: { width: '100%', maxWidth: "90%" } },
                React.createElement('canvas', { id: 'days-bar-chart', height: 220 })
            ),
            React.createElement('div', { id: 'groups-chart-container', style: { width: '100%', maxWidth: "90%" } },
                React.createElement('canvas', { id: 'groups-bar-chart' })
            )
        ),

        // Export buttons
        React.createElement('div', { style: { width: '100%', display: 'flex', justifyContent: 'center', marginTop: 32, gap: 16 } },
            React.createElement('button', {
                className: 'btn tooltip-wide',
                onClick: onExportPDF,
                'data-tooltip': 'Create a PDF report with charts and data'
            }, 'Export PDF'),
            React.createElement('button', {
                className: 'btn tooltip-wide',
                onClick: onExportReportCSV,
                'data-tooltip': 'Export filtered data as CSV'
            }, 'Export CSV')
        )
    );
} 