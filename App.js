// Minimalist Time Logger App
const { useState, useEffect, useRef } = React;

// Auto-detect GitHub Pages environment and disable DEV_MODE if needed
const isGitHubPages = window.location.hostname.endsWith('github.io');
// Toggle this to true for development (preloads from data.json if localStorage is empty)
const DEV_MODE = !isGitHubPages && true; // Set to false for production or automatically when on GitHub Pages

function App() {
    const [groups, setGroups] = useState([]);
    const [newGroup, setNewGroup] = useState('');
    const [_, forceUpdate] = useState(0); // for timer re-render
    const timerRef = useRef();
    const fileInputRef = useRef();
    const [loading, setLoading] = useState(true);
    const [manualIdx, setManualIdx] = useState(null); // index of group for manual entry
    const [manualForm, setManualForm] = useState({ date: '', start: '', end: '' });
    const [menuOpen, setMenuOpen] = useState(false);
    const [tab, setTab] = useState('log');
    const [reportMonth, setReportMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    // Add state for info dialog
    const [infoOpen, setInfoOpen] = useState(false);

    // Chart.js refs
    const daysChartRef = useRef();
    const groupsChartRef = useRef();

    // 1. Add state for archived section collapse
    const [archivedOpen, setArchivedOpen] = useState(false);

    // 2. Add state for selected groups (multi-select)
    const [selectedGroups, setSelectedGroups] = useState(['all']);

    // Demo mode: add a banner if no data is present, allow entering demo mode (loads sample data), and add an exit demo mode button that clears localStorage and reloads the app
    const [demoBanner, setDemoBanner] = useState(false); // show demo suggestion
    const [demoMode, setDemoMode] = useState(false); // track if in demo mode

    // Load data from localStorage only
    useEffect(() => {
        const saved = localStorage.getItem('groups');
        const demoFlag = localStorage.getItem('demoMode');
        let hasData = false;
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                hasData = Array.isArray(parsed) ? parsed.length > 0 : (parsed.groups && parsed.groups.length > 0);
            } catch {
                hasData = false;
            }
        }
        if (saved && hasData) {
            setGroups(Array.isArray(JSON.parse(saved)) ? JSON.parse(saved) : JSON.parse(saved).groups || []);
            setLoading(false);
            if (demoFlag) setDemoMode(true);
        } else if (DEV_MODE || isGitHubPages) {
            setDemoBanner(true); // Suggest demo mode if no data (in Dev or on GitHub Pages)
            setGroups([]);
            setLoading(false);
            setDemoMode(false);
        } else {
            setLoading(false);
        }
    }, []);

    // Save data to localStorage on groups change
    useEffect(() => {
        if (!loading) {
            localStorage.setItem('groups', JSON.stringify(groups));
        }
    }, [groups, loading]);

    useEffect(() => {
        timerRef.current = setInterval(() => forceUpdate(x => x + 1), 1000);
        return () => clearInterval(timerRef.current);
    }, []);

    // When switching to report tab, default to all active groups if none selected
    useEffect(() => {
        if (tab === 'report' && selectedGroups.length === 0) {
            setSelectedGroups(['all']);
        }
    }, [tab, selectedGroups]);

    // Render charts when reporting tab, month, or data changes
    useEffect(() => {
        if (tab !== 'report') return;
        const daysCtx = document.getElementById('days-bar-chart');
        const groupsCtx = document.getElementById('groups-bar-chart');
        if (!daysCtx || !groupsCtx) return;
        if (daysChartRef.current) daysChartRef.current.destroy();
        if (groupsChartRef.current) groupsChartRef.current.destroy();
        const days = getMonthData().days;
        // Sort days chronologically (they're in YYYY-MM-DD format)
        const dayLabels = Object.keys(days).sort();
        const dayData = dayLabels.map(d => +(days[d] / 3600).toFixed(2)); // hours

        // Format day labels to show only day numbers
        const formattedDayLabels = dayLabels.map(d => parseInt(d.split('-')[2], 10));

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
                                // Show day numbers at regular intervals
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
        // Groups bar chart
        const groups = getMonthData().groupTotals;
        let groupLabels = Object.keys(groups);
        // Sort groups by total hours descending
        groupLabels = groupLabels.sort((a, b) => (groups[b] || 0) - (groups[a] || 0));
        const groupData = groupLabels.map(g => +(groups[g] / 3600).toFixed(2)); // hours
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
                            // Make sure labels are fully visible
                            autoSkip: false,
                            maxRotation: 0,
                            minRotation: 0
                        }
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
            },
            plugins: window.ChartDataLabels ? [window.ChartDataLabels] : []
        });

        // Update groups chart height based on number of groups
        if (groupLabels.length > 0) {
            const groupContainerHeight = Math.max(220, groupLabels.length * 40);
            document.getElementById('groups-chart-container').style.height = `${groupContainerHeight}px`;
        }

        return () => {
            if (daysChartRef.current) daysChartRef.current.destroy();
            if (groupsChartRef.current) groupsChartRef.current.destroy();
        };
    }, [tab, reportMonth, groups, selectedGroups]);

    // 2. Update addGroup to include archived: false
    function addGroup(e) {
        e.preventDefault();
        if (!newGroup.trim()) return;
        setGroups([
            ...groups,
            { name: newGroup.trim(), logs: [], running: false, startedAt: null, archived: false }
        ]);
        setNewGroup('');
        if (localStorage.getItem('demoMode')) {
            localStorage.removeItem('demoMode');
            setDemoMode(false);
        }
    }

    function startTimer(idx) {
        setGroups(groups =>
            groups.map((g, i) =>
                i === idx
                    ? { ...g, running: true, startedAt: Date.now() }
                    : g
            )
        );
    }

    function stopTimer(idx) {
        setGroups(groups =>
            groups.map((g, i) => {
                if (i !== idx || !g.running) return g;
                const now = Date.now();
                const duration = Math.floor((now - g.startedAt) / 1000);
                return {
                    ...g,
                    running: false,
                    startedAt: null,
                    logs: [
                        { start: g.startedAt, end: now, duration },
                        ...g.logs
                    ]
                };
            })
        );
    }

    function formatDuration(sec) {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return [h, m, s]
            .map(v => v.toString().padStart(2, '0'))
            .join(':');
    }

    // Format duration as HH:MM (no seconds)
    function formatDurationHM(sec) {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        return [h, m].map(v => v.toString().padStart(2, '0')).join('h');
    }

    // Export as JSON (download from local data)
    function exportJSON() {
        const dataStr = JSON.stringify({ groups }, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = 'timelogger_data.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    // Export as CSV (download from local data)
    function exportCSV() {
        // Aggregate logs by group and day
        const aggregatedData = {};

        groups.forEach(g => {
            (g.logs || []).forEach(log => {
                const date = new Date(log.start).toISOString().slice(0, 10);
                const key = `${g.name}|${date}`;

                if (!aggregatedData[key]) {
                    aggregatedData[key] = {
                        group: g.name,
                        date: date,
                        totalDuration: 0
                    };
                }

                aggregatedData[key].totalDuration += log.duration;
            });
        });

        let csv = 'Group,Date,Duration (hours)\n';

        // Convert aggregated data to CSV
        Object.values(aggregatedData).forEach(entry => {
            const hours = (entry.totalDuration / 3600).toFixed(2);
            csv += `"${entry.group}","${entry.date}",${hours}\n`;
        });

        const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        const exportFileDefaultName = 'timelogger_data.csv';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    // Import from JSON (local file, then update localStorage)
    function importJSON(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = evt => {
            try {
                const data = JSON.parse(evt.target.result);
                if (data.groups && Array.isArray(data.groups)) {
                    setGroups(data.groups);
                    if (localStorage.getItem('demoMode')) {
                        localStorage.removeItem('demoMode');
                        setDemoMode(false);
                    }
                } else {
                    alert('Invalid file format.');
                }
            } catch {
                alert('Could not parse file.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    function openManualForm(idx) {
        setManualIdx(idx);
        setManualForm({ date: new Date().toISOString().slice(0, 10), start: '', end: '' });
    }

    function closeManualForm() {
        setManualIdx(null);
        setManualForm({ date: '', start: '', end: '' });
    }

    function handleManualChange(e) {
        setManualForm(f => ({ ...f, [e.target.name]: e.target.value }));
    }

    function submitManualEntry(e) {
        e.preventDefault();
        const { date, start, end } = manualForm;
        if (!date || !start || !end) return;
        const startDate = new Date(`${date}T${start}`);
        const endDate = new Date(`${date}T${end}`);
        if (isNaN(startDate) || isNaN(endDate) || endDate <= startDate) {
            alert('Invalid time range.');
            return;
        }
        const duration = Math.floor((endDate - startDate) / 1000);
        setGroups(groups =>
            groups.map((g, i) =>
                i === manualIdx
                    ? {
                        ...g,
                        logs: [
                            { start: startDate.getTime(), end: endDate.getTime(), duration },
                            ...g.logs
                        ]
                    }
                    : g
            )
        );
        closeManualForm();
    }

    function deleteGroup(idx) {
        if (window.confirm('Are you sure you want to delete this group and all its logs?')) {
            setGroups(groups => groups.filter((_, i) => i !== idx));
        }
    }

    function deleteLog(groupIdx, logIdx) {
        // Delete immediately, no confirmation
        setGroups(groups =>
            groups.map((g, i) =>
                i === groupIdx
                    ? { ...g, logs: g.logs.filter((_, j) => j !== logIdx) }
                    : g
            )
        );
    }

    function toggleMenu() { setMenuOpen(open => !open); }
    function closeMenu() { setMenuOpen(false); }

    // Add function to toggle info dialog
    function toggleInfo() { setInfoOpen(open => !open); }

    function changeMonth(offset) {
        const [year, month] = reportMonth.split('-').map(Number);
        const d = new Date(year, month - 1 + offset, 1);
        setReportMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    // Calculate reporting data
    function getMonthData(selectedProjs = selectedGroups) {
        const [year, month] = reportMonth.split('-').map(Number);
        const start = new Date(year, month - 1, 1).getTime();
        const end = new Date(year, month, 1).getTime();
        let totalSeconds = 0;
        const groupsSet = new Set();
        const days = {};
        const groupTotals = {};

        // Initialize all days in the month with zero duration
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const dayStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            days[dayStr] = 0;
        }

        // Handle both legacy 'all' string and empty array as "all projects"
        const showAllProjects = selectedProjs.length === 0 ||
            (selectedProjs.length === 1 && selectedProjs[0] === 'all');

        groups.forEach(g => {
            // Skip archived projects in reporting
            if (g.archived) return;

            // Filter by selected projects
            if (!showAllProjects && !selectedProjs.includes(g.name)) return;

            g.logs.forEach(log => {
                if (log.start >= start && log.start < end) {
                    totalSeconds += log.duration;
                    groupsSet.add(g.name);
                    // Per day
                    const day = new Date(log.start).toISOString().slice(0, 10);
                    days[day] = (days[day] || 0) + log.duration;
                    // Per project
                    groupTotals[g.name] = (groupTotals[g.name] || 0) + log.duration;
                }
            });
        });
        return {
            totalSeconds,
            groupCount: groupsSet.size,
            days,
            groupTotals
        };
    }
    // Calculate current month data with the current selection state
    const monthData = getMonthData();

    // Export PDF for reporting tab
    async function exportPDF() {
        const jsPDF = window.jspdf.jsPDF;
        const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
        // Title
        doc.setFontSize(20);
        doc.text('Monthly Report', 40, 50);
        // Month
        doc.setFontSize(14);
        doc.text(new Date(reportMonth + '-01').toLocaleString(undefined, { month: 'long', year: 'numeric' }), 40, 80);
        // Project filter
        doc.setFontSize(12);

        // Show selected projects
        if (selectedGroups.length === 0 || (selectedGroups.length === 1 && selectedGroups[0] === 'all')) {
            doc.text('Groups: All groups', 40, 100);
        } else {
            doc.text('Groups: ' + selectedGroups.join(', '), 40, 100);
        }

        // Indicators
        doc.setFontSize(12);
        doc.text('Total time this month: ' + formatDurationHM(monthData.totalSeconds), 40, 120);
        doc.text('Groups worked on: ' + monthData.groupCount, 40, 140);
        // Charts
        // Use html2canvas to render the chart canvases
        const daysCanvas = document.getElementById('days-bar-chart');
        const groupsCanvas = document.getElementById('groups-bar-chart');
        let y = 170;
        if (daysCanvas) {
            const imgData = await window.html2canvas(daysCanvas, { backgroundColor: null }).then(canvas => canvas.toDataURL('image/png'));
            doc.text('Time per day', 40, y);
            doc.addImage(imgData, 'PNG', 40, y + 10, 480, 180);
            y += 200;
        }
        if (groupsCanvas) {
            const imgData2 = await window.html2canvas(groupsCanvas, { backgroundColor: null }).then(canvas => canvas.toDataURL('image/png'));
            doc.text('Time per group', 40, y);
            doc.addImage(imgData2, 'PNG', 40, y + 10, 480, 180);
        }
        doc.save('monthly_report.pdf');
    }

    // Export CSV for reporting tab with filtered data
    function exportReportCSV() {
        const [year, month] = reportMonth.split('-').map(Number);
        const start = new Date(year, month - 1, 1).getTime();
        const end = new Date(year, month, 1).getTime();

        // Handle both legacy 'all' string and empty array as "all projects"
        const showAllProjects = selectedGroups.length === 0 ||
            (selectedGroups.length === 1 && selectedGroups[0] === 'all');

        // Aggregate logs by project and day
        const aggregatedData = {};

        groups.forEach(g => {
            // Skip archived projects
            if (g.archived) return;

            // Filter by selected projects
            if (!showAllProjects && !selectedGroups.includes(g.name)) return;

            (g.logs || []).forEach(log => {
                // Filter by selected month
                if (log.start >= start && log.start < end) {
                    const date = new Date(log.start).toISOString().slice(0, 10);
                    const key = `${g.name}|${date}`;

                    if (!aggregatedData[key]) {
                        aggregatedData[key] = {
                            group: g.name,
                            date: date,
                            totalDuration: 0
                        };
                    }

                    aggregatedData[key].totalDuration += log.duration;
                }
            });
        });

        let csv = 'Group,Date,Duration (hours)\n';

        // Convert aggregated data to CSV
        Object.values(aggregatedData).forEach(entry => {
            const hours = (entry.totalDuration / 3600).toFixed(2);
            csv += `"${entry.group}","${entry.date}",${hours}\n`;
        });

        const fileName = `monthly_report_${reportMonth}.csv`;
        const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', fileName);
        linkElement.click();
    }

    // Helper to check for overlapping logs in a list
    function findOverlappingLogs(groups) {
        const allLogs = [];
        groups.forEach((g) => {
            (g.logs || []).forEach(log => {
                allLogs.push({ ...log, group: g.name });
            });
        });
        allLogs.sort((a, b) => a.start - b.start);
        const overlaps = [];
        for (let i = 0; i < allLogs.length; i++) {
            for (let j = i + 1; j < allLogs.length; j++) {
                if (allLogs[j].start >= allLogs[i].end) break;
                if (allLogs[i].group !== allLogs[j].group) {
                    overlaps.push({
                        first: allLogs[i],
                        second: allLogs[j]
                    });
                }
            }
        }
        return overlaps;
    }

    const overlapping = findOverlappingLogs(groups);

    // 3. Archive/unarchive functions
    function archiveGroup(idx) {
        setGroups(groups =>
            groups.map((g, i) => i === idx ? { ...g, archived: true, running: false, startedAt: null } : g)
        );
    }
    function unarchiveGroup(idx) {
        setGroups(groups =>
            groups.map((g, i) => i === idx ? { ...g, archived: false } : g)
        );
    }

    // 4. In the log tab UI, split projects into active and archived
    const activeGroups = groups.filter(g => !g.archived);
    const archivedGroups = groups.filter(g => g.archived);

    // Demo mode: load sample data into localStorage and state
    function enterDemoMode() {
        setLoading(true);

        // Try multiple possible paths to handle different deployment environments
        const tryFetch = (paths) => {
            if (paths.length === 0) {
                console.error('Could not load demo data from any path');
                setLoading(false);
                return;
            }

            fetch(paths[0])
                .then(res => {
                    if (!res.ok) {
                        throw new Error('Path not found');
                    }
                    return res.json();
                })
                .then(data => {
                    setGroups(data.groups || []);
                    localStorage.setItem('groups', JSON.stringify(data.groups || []));
                    localStorage.setItem('demoMode', '1');
                    setDemoMode(true);
                    setDemoBanner(false);
                    setLoading(false);
                })
                .catch(() => {
                    console.log(`Failed to load from ${paths[0]}, trying next path...`);
                    tryFetch(paths.slice(1));
                });
        };

        // Try different possible paths in order
        tryFetch([
            './public/demo-data.json',
            '/public/demo-data.json',
            '/demo-data.json',
            'demo-data.json'
        ]);
    }
    // Exit demo mode: clear localStorage and reload
    function exitDemoMode() {
        localStorage.removeItem('groups');
        localStorage.removeItem('demoMode');
        window.location.reload();
    }

    return (
        React.createElement('div', { className: 'container' },
            demoBanner && !loading && React.createElement('div', {
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
                    onClick: enterDemoMode,
                    style: { marginLeft: 8 }
                }, 'Load Demo')
            ),
            demoMode && React.createElement('div', {
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
                    onClick: exitDemoMode,
                    style: { marginLeft: 8 }
                }, 'Exit Demo Mode')
            ),
            React.createElement('div', { className: 'header-row' },
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
                            onClick: () => { exportJSON(); closeMenu(); },
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
                                onChange: e => { importJSON(e); closeMenu(); }
                            })
                        ),
                        React.createElement('button', {
                            onClick: () => { exportCSV(); closeMenu(); },
                            'data-tooltip': 'Export time data as CSV file'
                        }, 'Export CSV')
                    )
                ),
                React.createElement('h1', { className: 'app-title' }, "Felix's Minimal Time Logger"),
                React.createElement('button', {
                    className: 'btn info-btn',
                    onClick: toggleInfo,
                    'aria-label': 'Show app information',
                    'data-tooltip': 'About this app',
                    type: 'button'
                }, React.createElement('i', { className: 'bi bi-info-circle', style: { fontSize: '20px', color: '#374151' } })),
            ),
            // Info dialog
            infoOpen && React.createElement('div', {
                className: 'modal-overlay',
                onClick: toggleInfo,
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
                        onClick: toggleInfo,
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
            ),
            // Tab navigation
            React.createElement('div', { className: 'tab-bar' },
                ['log', 'report'].map(t =>
                    React.createElement('div', {
                        key: t,
                        className: 'tab-btn' + (tab === t ? ' active' : ''),
                        onClick: () => setTab(t),
                        'data-tooltip': t === 'log' ? 'Manage your time entries' : 'View time reports and statistics'
                    }, t === 'log' ? 'Log' : 'Report')
                )
            ),
            tab === 'log' && (
                React.createElement('div', null,
                    overlapping.length > 0 && React.createElement('div', {
                        style: {
                            background: '#fffbe6',
                            border: '1.5px solid #facc15',
                            color: '#b45309',
                            borderRadius: 8,
                            padding: '14px 18px',
                            marginBottom: 18,
                            fontSize: '1rem',
                            fontWeight: 500
                        }
                    },
                        'Warning: Overlapping time entries detected!',
                        React.createElement('ul', { style: { margin: '10px 0 0 0', paddingLeft: 18, fontWeight: 400, fontSize: '0.98rem' } },
                            overlapping.map((o, i) =>
                                React.createElement('li', { key: i },
                                    `Group: ${o.first.group} — ` +
                                    `${new Date(o.first.start).toLocaleString()} - ${new Date(o.first.end).toLocaleTimeString()} overlaps with ` +
                                    `Group: ${o.second.group} — ` +
                                    `${new Date(o.second.start).toLocaleString()} - ${new Date(o.second.end).toLocaleTimeString()}`
                                )
                            )
                        )
                    ),
                    React.createElement('form', { onSubmit: addGroup, className: 'add-form' },
                        React.createElement('input', {
                            value: newGroup,
                            onChange: e => setNewGroup(e.target.value),
                            placeholder: 'Add group...',
                            className: 'input'
                        }),
                        React.createElement('button', {
                            type: 'submit',
                            className: 'btn',
                            'data-tooltip': 'Create a new group'
                        }, 'Add')
                    ),
                    loading
                        ? React.createElement('p', { className: 'empty' }, 'Loading...')
                        : activeGroups.length === 0 && React.createElement('p', { className: 'empty' }, 'No groups yet.'),
                    activeGroups.length > 0 && activeGroups.map((g, idx) =>
                        React.createElement('div', { key: idx, className: 'project' },
                            React.createElement('div', { className: 'project-header' },
                                React.createElement('span', { className: 'project-name' }, g.name),
                                React.createElement('button', {
                                    className: 'btn play-btn' + (g.running ? ' running' : ''),
                                    onClick: g.running ? () => stopTimer(groups.indexOf(g)) : () => startTimer(groups.indexOf(g)),
                                    'data-tooltip': g.running ? 'Stop the timer' : 'Start timing for this group',
                                    title: g.running ? 'Stop timer' : 'Start timer'
                                },
                                    g.running
                                        ? formatDuration(Math.floor((Date.now() - g.startedAt) / 1000))
                                        : React.createElement('i', { className: 'bi bi-play-fill', style: { color: '#1a7f4f' } })
                                ),
                                React.createElement('button', {
                                    className: 'btn add-entry',
                                    onClick: () => openManualForm(groups.indexOf(g)),
                                    'data-tooltip': 'Add a manual time entry',
                                    title: 'Add manual entry',
                                    style: { marginLeft: 4 }
                                }, React.createElement('i', { className: 'bi bi-plus', style: { fontSize: '20px', color: '#374151' } })),
                                React.createElement('button', {
                                    className: 'btn archive-btn-square',
                                    onClick: () => archiveGroup(groups.indexOf(g)),
                                    'data-tooltip': 'Archive this group',
                                    title: 'Archive group',
                                    style: { marginLeft: 4 }
                                },
                                    React.createElement('i', { className: 'bi bi-archive', style: { fontSize: '20px', color: '#374151' } })
                                ),
                                React.createElement('button', {
                                    className: 'btn delete-btn-square',
                                    onClick: () => deleteGroup(groups.indexOf(g)),
                                    'data-tooltip': 'Delete this group',
                                    title: 'Delete group',
                                    style: { marginLeft: 4 }
                                },
                                    React.createElement('i', { className: 'bi bi-trash', style: { fontSize: '20px', color: '#374151' } })
                                )
                            ),
                            manualIdx === groups.indexOf(g) && React.createElement('form', {
                                onSubmit: submitManualEntry,
                                style: { display: 'flex', gap: 6, margin: '8px 0', alignItems: 'center', justifyContent: 'center' }
                            },
                                React.createElement('input', {
                                    type: 'date',
                                    name: 'date',
                                    value: manualForm.date,
                                    onChange: handleManualChange,
                                    required: true,
                                    style: { padding: 4 }
                                }),
                                React.createElement('input', {
                                    type: 'time',
                                    name: 'start',
                                    value: manualForm.start,
                                    onChange: handleManualChange,
                                    required: true,
                                    style: { padding: 4 }
                                }),
                                React.createElement('input', {
                                    type: 'time',
                                    name: 'end',
                                    value: manualForm.end,
                                    onChange: handleManualChange,
                                    required: true,
                                    style: { padding: 4 }
                                }),
                                React.createElement('button', {
                                    type: 'submit',
                                    className: 'btn tooltip-wide',
                                    'data-tooltip': 'Save this time entry to the project'
                                }, 'Save'),
                                React.createElement('button', {
                                    type: 'button',
                                    className: 'btn tooltip-wide',
                                    onClick: closeManualForm,
                                    'data-tooltip': 'Cancel without saving this entry'
                                }, 'Cancel')
                            ),
                            g.logs.length > 0 && React.createElement('ul', { className: 'log-list' },
                                g.logs.map((log, i) =>
                                    React.createElement('li', { key: i, className: 'log-item indented' },
                                        React.createElement('button', {
                                            className: 'delete-log-btn',
                                            title: 'Delete entry',
                                            'data-tooltip': 'Delete this time entry',
                                            onClick: () => deleteLog(groups.indexOf(g), i)
                                        }, '\u00D7'),
                                        new Date(log.start).toLocaleString(),
                                        ' — ',
                                        formatDuration(log.duration)
                                    )
                                )
                            )
                        )
                    ),
                    // Archived section
                    archivedGroups.length > 0 && React.createElement('div', { style: { marginTop: 32 } },
                        React.createElement('button', {
                            className: 'btn',
                            style: { width: '100%', background: '#f3f3f3', color: '#888', marginBottom: 8 },
                            onClick: () => setArchivedOpen(open => !open),
                            'data-tooltip': archivedOpen ? 'Hide archived groups' : 'Show your archived groups'
                        },
                            archivedOpen ? 'Hide Archived Groups' : `Show Archived Groups (${archivedGroups.length})`
                        ),
                        archivedOpen && archivedGroups.map((g, idx) =>
                            React.createElement('div', { key: idx, className: 'project', style: { opacity: 0.7 } },
                                React.createElement('div', { className: 'project-header' },
                                    React.createElement('span', { className: 'project-name' }, g.name),
                                    React.createElement('button', {
                                        className: 'btn unarchive-btn',
                                        onClick: () => unarchiveGroup(groups.indexOf(g)),
                                        title: 'Unarchive group',
                                        'data-tooltip': 'Restore this group',
                                        style: { marginLeft: 4 }
                                    },
                                        React.createElement('i', { className: 'bi bi-arrow-up-square', style: { fontSize: '20px', color: '#374151' } })
                                    ),
                                    React.createElement('button', {
                                        className: 'btn delete-btn-square',
                                        onClick: () => deleteGroup(groups.indexOf(g)),
                                        'data-tooltip': 'Delete this group',
                                        title: 'Delete group',
                                        style: { marginLeft: 4 }
                                    },
                                        React.createElement('i', { className: 'bi bi-trash', style: { fontSize: '20px', color: '#374151' } })
                                    )
                                ),
                                g.logs.length > 0 && React.createElement('ul', { className: 'log-list' },
                                    g.logs.map((log, i) =>
                                        React.createElement('li', { key: i, className: 'log-item indented' },
                                            React.createElement('button', {
                                                className: 'delete-log-btn',
                                                title: 'Delete entry',
                                                onClick: () => deleteLog(groups.indexOf(g), i)
                                            }, '\u00D7'),
                                            new Date(log.start).toLocaleString(),
                                            ' — ',
                                            formatDuration(log.duration)
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            ),
            tab === 'report' && (
                React.createElement('div', null,
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
                                onClick: () => setSelectedGroups(['all']),
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
                                            // If "all" is selected, clear it first
                                            const currentSelected = selectedGroups.filter(proj => proj !== 'all');

                                            if (currentSelected.includes(g.name)) {
                                                // Remove the project if already selected
                                                setSelectedGroups(
                                                    currentSelected.filter(proj => proj !== g.name)
                                                );
                                            } else {
                                                // Add the project to selection
                                                setSelectedGroups([...currentSelected, g.name]);
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
                    React.createElement('div', { style: { width: '100%', display: 'flex', justifyContent: 'center', marginTop: 32, gap: 16 } },
                        React.createElement('button', {
                            className: 'btn tooltip-wide',
                            onClick: exportPDF,
                            'data-tooltip': 'Create a PDF report with charts and data'
                        }, 'Export PDF'),
                        React.createElement('button', {
                            className: 'btn tooltip-wide',
                            onClick: exportReportCSV,
                            'data-tooltip': 'Export filtered data as CSV'
                        }, 'Export CSV')
                    )
                )
            )
        )
    );
}

// Footer component
function Footer() {
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

ReactDOM.createRoot(document.getElementById('root')).render(
    React.createElement(
        React.Fragment,
        null,
        React.createElement(App),
        React.createElement(Footer)
    )
); 