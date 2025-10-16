// Report tab component with charts and export functionality
const { useState, useEffect, useRef, useMemo } = React;
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
    const [filteredGroups, setFilteredGroups] = useState([]);

    // Get all groups that have time entries for the selected month (including archived)
    const groupsWithTimeInMonth = useMemo(() => {
        const [year, month] = reportMonth.split('-').map(Number);
        return groups.filter(group => {
            // Check if group has any logs in the selected month
            return group.logs && group.logs.some(log => {
                const logDate = new Date(log.start);
                return logDate.getFullYear() === year && logDate.getMonth() === month - 1;
            });
        });
    }, [groups, reportMonth]);

    // Memoize monthData calculation to prevent unnecessary re-renders
    const monthData = useMemo(() => {
        // Filter out groups that are in the filtered state
        const availableGroups = groups.filter(group => !filteredGroups.includes(group.name));
        return getMonthData(availableGroups, selectedGroups, reportMonth);
    }, [groups, selectedGroups, reportMonth, filteredGroups]);

    const changeMonth = (offset) => {
        const [year, month] = reportMonth.split('-').map(Number);
        const newDate = new Date(year, month - 1 + offset, 1);
        const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
        onReportMonthChange(newMonth);
    };

    // Render charts when data changes
    useEffect(() => {
        const daysCanvas = document.getElementById('days-bar-chart');
        const groupsCanvas = document.getElementById('groups-bar-chart');
        if (!daysCanvas || !groupsCanvas) return;

        // Set willReadFrequently attribute for better performance during PDF export
        const daysCtx = daysCanvas.getContext('2d', { willReadFrequently: true });
        const groupsCtx = groupsCanvas.getContext('2d', { willReadFrequently: true });

        if (daysChartRef.current) daysChartRef.current.destroy();
        if (groupsChartRef.current) groupsChartRef.current.destroy();

        const days = monthData.days;

        // Generate all days of the month to show complete timeline
        const [year, month] = reportMonth.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        const allDayLabels = [];
        const allDayData = [];
        const fullDayLabels = []; // For tooltip display

        for (let day = 1; day <= daysInMonth; day++) {
            const dayKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hours = days[dayKey] ? +(days[dayKey] / 3600).toFixed(2) : 0;

            allDayLabels.push(day);
            allDayData.push(hours);
            fullDayLabels.push(dayKey);
        }

        // Days chart
        daysChartRef.current = new window.Chart(daysCtx, {
            type: 'bar',
            data: {
                labels: allDayLabels,
                datasets: [{
                    label: 'Hours per day',
                    data: allDayData,
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
                                return fullDayLabels[idx];
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
                            autoSkip: false, // Show all day labels
                            maxTicksLimit: daysInMonth, // Allow all days to be shown
                            maxRotation: 0, // Keep day numbers horizontal
                            minRotation: 0, // Prevent any rotation
                            callback: function (value, index) {
                                return allDayLabels[index];
                            }
                        },
                        grid: {
                            display: false // Remove all vertical grid lines
                        }
                    },
                    y: {
                        title: { display: true, text: 'Hours' },
                        beginAtZero: true,
                        grid: {
                            color: '#f0f0f0' // Keep horizontal grid lines
                        }
                    }
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
        const groupData = groupLabels.map(g => +(groupTotals[g] / 3600).toFixed(2));

        // Helper function to split long group names into multiple lines
        const splitLongLabel = (label, maxCharsPerLine = 20) => {
            if (label.length <= maxCharsPerLine) return [label];

            const words = label.split(' ');
            const lines = [];
            let currentLine = '';

            words.forEach(word => {
                if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
                    currentLine = currentLine ? currentLine + ' ' + word : word;
                } else {
                    if (currentLine) {
                        lines.push(currentLine);
                        currentLine = word;
                    } else {
                        // Word itself is too long, split it
                        lines.push(word.substring(0, maxCharsPerLine));
                        currentLine = word.substring(maxCharsPerLine);
                    }
                }
            });

            if (currentLine) lines.push(currentLine);
            return lines;
        };

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
                            font: {
                                size: Math.max(8, 12 - Math.floor(groupLabels.length / 5)) // Reduce font size based on number of groups
                            },
                            callback: function (value, index) {
                                const label = this.getLabelForValue(value);
                                // Split long labels into multiple lines
                                const lines = splitLongLabel(label, 25);
                                return lines;
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
        // Month navigation
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 18 } },
            React.createElement('button', {
                className: 'btn tooltip-wide',
                onClick: () => changeMonth(-1),
            }, '\u25C0'),
            React.createElement('span', { style: { fontWeight: 500, fontSize: '1.1rem' } },
                new Date(reportMonth + '-01').toLocaleString(undefined, { month: 'long', year: 'numeric' })
            ),
            React.createElement('button', {
                className: 'btn tooltip-wide',
                onClick: () => changeMonth(1),
            }, '\u25B6')
        ),

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
                        : 'project-tag'),
                    onClick: () => {
                        onSelectedGroupsChange(['all']);
                        setFilteredGroups([]); // Clear all filtered groups when selecting "All"
                    }
                }, 'All groups'),

                // Individual project options sorted alphabetically
                [...groupsWithTimeInMonth]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(g =>
                        React.createElement('div', {
                            key: g.name,
                            className: (selectedGroups.includes(g.name) ? 'project-tag selected' : 'project-tag') +
                                (g.archived ? ' archived' : '') +
                                (filteredGroups.includes(g.name) ? ' filtered' : ''),
                            onClick: () => {
                                const isSelected = selectedGroups.includes(g.name);
                                const isFiltered = filteredGroups.includes(g.name);

                                if (isFiltered) {
                                    // Filtered → Untouched: Remove from both filtered and selected
                                    setFilteredGroups(filteredGroups.filter(name => name !== g.name));
                                    onSelectedGroupsChange(selectedGroups.filter(proj => proj !== g.name));
                                } else if (isSelected) {
                                    // Selected → Filtered: Remove from selected, add to filtered
                                    onSelectedGroupsChange(selectedGroups.filter(proj => proj !== g.name));
                                    setFilteredGroups([...filteredGroups, g.name]);
                                } else {
                                    // Untouched → Selected: Add to selected
                                    const currentSelected = selectedGroups.filter(proj => proj !== 'all');
                                    onSelectedGroupsChange([...currentSelected, g.name]);
                                }
                            },
                            title: filteredGroups.includes(g.name)
                                ? 'Filtered out - Click to make untouched'
                                : selectedGroups.includes(g.name)
                                    ? 'Selected - Click to filter out'
                                    : 'Untouched - Click to select'
                        }, g.name)
                    )
            )
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
            React.createElement('div', {
                id: 'groups-chart-container',
                style: {
                    width: '100%',
                    maxWidth: "90%",
                    // Dynamic height based on number of groups (minimum 200px, add 40px per group)
                    height: Math.max(200, Object.keys(monthData.groupTotals).length * 40) + 'px'
                }
            },
                React.createElement('canvas', { id: 'groups-bar-chart' })
            )
        ),

        // Export buttons
        React.createElement('div', { style: { width: '100%', display: 'flex', justifyContent: 'center', marginTop: 32, gap: 16 } },
            React.createElement('button', {
                className: 'btn tooltip-wide',
                onClick: () => onExportPDF(filteredGroups),
            }, 'Export PDF'),
            React.createElement('button', {
                className: 'btn tooltip-wide',
                onClick: () => onExportReportCSV(filteredGroups),
            }, 'Export CSV')
        )
    );
} 