// Minimalist Time Logger App
const { useState, useEffect, useRef } = React;

// Auto-detect GitHub Pages environment and disable DEV_MODE if needed
const isGitHubPages = window.location.hostname.endsWith('github.io');
// Toggle this to true for development (preloads from data.json if localStorage is empty)
const DEV_MODE = !isGitHubPages && true; // Set to false for production or automatically when on GitHub Pages

function App() {
    const [projects, setProjects] = useState([]);
    const [newProject, setNewProject] = useState('');
    const [_, forceUpdate] = useState(0); // for timer re-render
    const timerRef = useRef();
    const fileInputRef = useRef();
    const [loading, setLoading] = useState(true);
    const [manualIdx, setManualIdx] = useState(null); // index of project for manual entry
    const [manualForm, setManualForm] = useState({ date: '', start: '', end: '' });
    const [menuOpen, setMenuOpen] = useState(false);
    const [tab, setTab] = useState('log');
    const [reportMonth, setReportMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    // Chart.js refs
    const daysChartRef = useRef();
    const projectsChartRef = useRef();

    // 1. Add state for archived section collapse
    const [archivedOpen, setArchivedOpen] = useState(false);

    // 2. Add state for selected projects (multi-select)
    const [selectedProjects, setSelectedProjects] = useState(['all']);

    // Demo mode: add a banner if no data is present, allow entering demo mode (loads sample data), and add an exit demo mode button that clears localStorage and reloads the app
    const [demoBanner, setDemoBanner] = useState(false); // show demo suggestion
    const [demoMode, setDemoMode] = useState(false); // track if in demo mode

    // Load data from localStorage only
    useEffect(() => {
        const saved = localStorage.getItem('projects');
        const demoFlag = localStorage.getItem('demoMode');
        let hasData = false;
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                hasData = Array.isArray(parsed) ? parsed.length > 0 : (parsed.projects && parsed.projects.length > 0);
            } catch {
                hasData = false;
            }
        }
        if (saved && hasData) {
            setProjects(Array.isArray(JSON.parse(saved)) ? JSON.parse(saved) : JSON.parse(saved).projects || []);
            setLoading(false);
            if (demoFlag) setDemoMode(true);
        } else if (DEV_MODE) {
            setDemoBanner(true); // Suggest demo mode if no data
            setProjects([]);
            setLoading(false);
            setDemoMode(false);
        } else {
            setLoading(false);
        }
    }, []);

    // Save data to localStorage on projects change
    useEffect(() => {
        if (!loading) {
            localStorage.setItem('projects', JSON.stringify(projects));
        }
    }, [projects, loading]);

    useEffect(() => {
        timerRef.current = setInterval(() => forceUpdate(x => x + 1), 1000);
        return () => clearInterval(timerRef.current);
    }, []);

    // When switching to report tab, default to all active projects if none selected
    useEffect(() => {
        if (tab === 'report' && selectedProjects.length === 0) {
            setSelectedProjects(['all']);
        }
    }, [tab, selectedProjects]);

    // Render charts when reporting tab, month, or data changes
    useEffect(() => {
        if (tab !== 'report') return;
        const daysCtx = document.getElementById('days-bar-chart');
        const projectsCtx = document.getElementById('projects-bar-chart');
        if (!daysCtx || !projectsCtx) return;
        if (daysChartRef.current) daysChartRef.current.destroy();
        if (projectsChartRef.current) projectsChartRef.current.destroy();
        const days = getMonthData().days;
        const dayLabels = Object.keys(days).sort();
        const dayData = dayLabels.map(d => +(days[d] / 3600).toFixed(2)); // hours
        daysChartRef.current = new window.Chart(daysCtx, {
            type: 'bar',
            data: {
                labels: dayLabels,
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
                    x: { title: { display: true, text: 'Day' } },
                    y: { title: { display: true, text: 'Hours' }, beginAtZero: true }
                },
                responsive: true,
                maintainAspectRatio: false,
            },
            plugins: window.ChartDataLabels ? [window.ChartDataLabels] : []
        });
        // Projects bar chart
        const projects = getMonthData().projectTotals;
        let projectLabels = Object.keys(projects);
        // Sort projects by total hours descending
        projectLabels = projectLabels.sort((a, b) => (projects[b] || 0) - (projects[a] || 0));
        const projectData = projectLabels.map(p => +(projects[p] / 3600).toFixed(2)); // hours
        projectsChartRef.current = new window.Chart(projectsCtx, {
            type: 'bar',
            data: {
                labels: projectLabels,
                datasets: [{
                    label: 'Hours per project',
                    data: projectData,
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
                    y: { title: { display: true, text: 'Project' } }
                },
                responsive: true,
                maintainAspectRatio: false,
            },
            plugins: window.ChartDataLabels ? [window.ChartDataLabels] : []
        });
        return () => {
            if (daysChartRef.current) daysChartRef.current.destroy();
            if (projectsChartRef.current) projectsChartRef.current.destroy();
        };
    }, [tab, reportMonth, projects, selectedProjects]);

    // 2. Update addProject to include archived: false
    function addProject(e) {
        e.preventDefault();
        if (!newProject.trim()) return;
        setProjects([
            ...projects,
            { name: newProject.trim(), logs: [], running: false, startedAt: null, archived: false }
        ]);
        setNewProject('');
        if (localStorage.getItem('demoMode')) {
            localStorage.removeItem('demoMode');
            setDemoMode(false);
        }
    }

    function startTimer(idx) {
        setProjects(projects =>
            projects.map((p, i) =>
                i === idx
                    ? { ...p, running: true, startedAt: Date.now() }
                    : p
            )
        );
    }

    function stopTimer(idx) {
        setProjects(projects =>
            projects.map((p, i) => {
                if (i !== idx || !p.running) return p;
                const now = Date.now();
                const duration = Math.floor((now - p.startedAt) / 1000);
                return {
                    ...p,
                    running: false,
                    startedAt: null,
                    logs: [
                        { start: p.startedAt, end: now, duration },
                        ...p.logs
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
        const dataStr = JSON.stringify({ projects }, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = 'timelogger_data.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    // Export as CSV (download from local data)
    function exportCSV() {
        let csv = 'Project,Start,End,Duration (hours)\n';
        projects.forEach(p => {
            (p.logs || []).forEach(log => {
                const hours = (log.duration / 3600).toFixed(2);
                csv += `"${p.name}","${new Date(log.start).toISOString()}","${new Date(log.end).toISOString()}",${hours}\n`;
            });
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
                if (data.projects && Array.isArray(data.projects)) {
                    setProjects(data.projects);
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
        setProjects(projects =>
            projects.map((p, i) =>
                i === manualIdx
                    ? {
                        ...p,
                        logs: [
                            { start: startDate.getTime(), end: endDate.getTime(), duration },
                            ...p.logs
                        ]
                    }
                    : p
            )
        );
        closeManualForm();
    }

    function deleteProject(idx) {
        if (window.confirm('Are you sure you want to delete this project and all its logs?')) {
            setProjects(projects => projects.filter((_, i) => i !== idx));
        }
    }

    function deleteLog(projectIdx, logIdx) {
        // Delete immediately, no confirmation
        setProjects(projects =>
            projects.map((p, i) =>
                i === projectIdx
                    ? { ...p, logs: p.logs.filter((_, j) => j !== logIdx) }
                    : p
            )
        );
    }

    function toggleMenu() { setMenuOpen(open => !open); }
    function closeMenu() { setMenuOpen(false); }

    function changeMonth(offset) {
        const [year, month] = reportMonth.split('-').map(Number);
        const d = new Date(year, month - 1 + offset, 1);
        setReportMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    // Calculate reporting data
    function getMonthData(selectedProjs = selectedProjects) {
        const [year, month] = reportMonth.split('-').map(Number);
        const start = new Date(year, month - 1, 1).getTime();
        const end = new Date(year, month, 1).getTime();
        let totalSeconds = 0;
        const projectsSet = new Set();
        const days = {};
        const projectTotals = {};

        // Handle both legacy 'all' string and empty array as "all projects"
        const showAllProjects = selectedProjs.length === 0 ||
            (selectedProjs.length === 1 && selectedProjs[0] === 'all');

        projects.forEach(p => {
            // Skip archived projects in reporting
            if (p.archived) return;

            // Filter by selected projects
            if (!showAllProjects && !selectedProjs.includes(p.name)) return;

            p.logs.forEach(log => {
                if (log.start >= start && log.start < end) {
                    totalSeconds += log.duration;
                    projectsSet.add(p.name);
                    // Per day
                    const day = new Date(log.start).toISOString().slice(0, 10);
                    days[day] = (days[day] || 0) + log.duration;
                    // Per project
                    projectTotals[p.name] = (projectTotals[p.name] || 0) + log.duration;
                }
            });
        });
        return {
            totalSeconds,
            projectCount: projectsSet.size,
            days,
            projectTotals
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
        if (selectedProjects.length === 0 || (selectedProjects.length === 1 && selectedProjects[0] === 'all')) {
            doc.text('Projects: All projects', 40, 100);
        } else {
            doc.text('Projects: ' + selectedProjects.join(', '), 40, 100);
        }

        // Indicators
        doc.setFontSize(12);
        doc.text('Total time this month: ' + formatDurationHM(monthData.totalSeconds), 40, 120);
        doc.text('Projects worked on: ' + monthData.projectCount, 40, 140);
        // Charts
        // Use html2canvas to render the chart canvases
        const daysCanvas = document.getElementById('days-bar-chart');
        const projectsCanvas = document.getElementById('projects-bar-chart');
        let y = 170;
        if (daysCanvas) {
            const imgData = await window.html2canvas(daysCanvas, { backgroundColor: null }).then(canvas => canvas.toDataURL('image/png'));
            doc.text('Time per day', 40, y);
            doc.addImage(imgData, 'PNG', 40, y + 10, 480, 180);
            y += 200;
        }
        if (projectsCanvas) {
            const imgData2 = await window.html2canvas(projectsCanvas, { backgroundColor: null }).then(canvas => canvas.toDataURL('image/png'));
            doc.text('Time per project', 40, y);
            doc.addImage(imgData2, 'PNG', 40, y + 10, 480, 180);
        }
        doc.save('monthly_report.pdf');
    }

    // Helper to check for overlapping logs in a list
    function findOverlappingLogs(projects) {
        const allLogs = [];
        projects.forEach((p) => {
            (p.logs || []).forEach(log => {
                allLogs.push({ ...log, project: p.name });
            });
        });
        allLogs.sort((a, b) => a.start - b.start);
        const overlaps = [];
        for (let i = 0; i < allLogs.length; i++) {
            for (let j = i + 1; j < allLogs.length; j++) {
                if (allLogs[j].start >= allLogs[i].end) break;
                if (allLogs[i].project !== allLogs[j].project) {
                    overlaps.push({
                        first: allLogs[i],
                        second: allLogs[j]
                    });
                }
            }
        }
        return overlaps;
    }

    const overlapping = findOverlappingLogs(projects);

    // 3. Archive/unarchive functions
    function archiveProject(idx) {
        setProjects(projects =>
            projects.map((p, i) => i === idx ? { ...p, archived: true, running: false, startedAt: null } : p)
        );
    }
    function unarchiveProject(idx) {
        setProjects(projects =>
            projects.map((p, i) => i === idx ? { ...p, archived: false } : p)
        );
    }

    // 4. In the log tab UI, split projects into active and archived
    const activeProjects = projects.filter(p => !p.archived);
    const archivedProjects = projects.filter(p => p.archived);

    // Demo mode: load sample data into localStorage and state
    function enterDemoMode() {
        setLoading(true);
        fetch('/demo-data.json')
            .then(res => res.json())
            .then(data => {
                setProjects(data.projects || []);
                localStorage.setItem('projects', JSON.stringify(data.projects || []));
                localStorage.setItem('demoMode', '1');
                setDemoMode(true);
                setDemoBanner(false);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }
    // Exit demo mode: clear localStorage and reload
    function exitDemoMode() {
        localStorage.removeItem('projects');
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
                React.createElement('h1', { className: 'app-title' }, "Felix's Minimal Time Logger")
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
                                    `Project: ${o.first.project} — ` +
                                    `${new Date(o.first.start).toLocaleString()} - ${new Date(o.first.end).toLocaleTimeString()} overlaps with ` +
                                    `Project: ${o.second.project} — ` +
                                    `${new Date(o.second.start).toLocaleString()} - ${new Date(o.second.end).toLocaleTimeString()}`
                                )
                            )
                        )
                    ),
                    React.createElement('form', { onSubmit: addProject, className: 'add-form' },
                        React.createElement('input', {
                            value: newProject,
                            onChange: e => setNewProject(e.target.value),
                            placeholder: 'Add project...',
                            className: 'input'
                        }),
                        React.createElement('button', {
                            type: 'submit',
                            className: 'btn',
                            'data-tooltip': 'Create a new project'
                        }, 'Add')
                    ),
                    loading
                        ? React.createElement('p', { className: 'empty' }, 'Loading...')
                        : activeProjects.length === 0 && React.createElement('p', { className: 'empty' }, 'No projects yet.'),
                    activeProjects.length > 0 && activeProjects.map((p, idx) =>
                        React.createElement('div', { key: idx, className: 'project' },
                            React.createElement('div', { className: 'project-header' },
                                React.createElement('span', { className: 'project-name' }, p.name),
                                React.createElement('button', {
                                    className: 'btn play-btn' + (p.running ? ' running' : ''),
                                    onClick: p.running ? () => stopTimer(projects.indexOf(p)) : () => startTimer(projects.indexOf(p)),
                                    'data-tooltip': p.running ? 'Stop the timer' : 'Start timing for this project',
                                    title: p.running ? 'Stop timer' : 'Start timer'
                                },
                                    p.running
                                        ? formatDuration(Math.floor((Date.now() - p.startedAt) / 1000))
                                        : React.createElement('i', { className: 'bi bi-play-fill', style: { color: '#1a7f4f' } })
                                ),
                                React.createElement('button', {
                                    className: 'btn add-entry',
                                    onClick: () => openManualForm(projects.indexOf(p)),
                                    'data-tooltip': 'Add a manual time entry',
                                    title: 'Add manual entry'
                                }, 'Add Entry'),
                                React.createElement('button', {
                                    className: 'btn archive-btn-square',
                                    onClick: () => archiveProject(projects.indexOf(p)),
                                    'data-tooltip': 'Archive this project',
                                    title: 'Archive project',
                                    style: { marginLeft: 4 }
                                },
                                    React.createElement('i', { className: 'bi bi-archive', style: { fontSize: '20px', color: '#374151' } })
                                ),
                                React.createElement('button', {
                                    className: 'btn delete-btn-square',
                                    onClick: () => deleteProject(projects.indexOf(p)),
                                    'data-tooltip': 'Delete this project',
                                    title: 'Delete project',
                                    style: { marginLeft: 4 }
                                },
                                    React.createElement('i', { className: 'bi bi-trash', style: { fontSize: '20px', color: '#374151' } })
                                )
                            ),
                            manualIdx === projects.indexOf(p) && React.createElement('form', {
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
                            p.logs.length > 0 && React.createElement('ul', { className: 'log-list' },
                                p.logs.map((log, i) =>
                                    React.createElement('li', { key: i, className: 'log-item indented' },
                                        React.createElement('button', {
                                            className: 'delete-log-btn',
                                            title: 'Delete entry',
                                            'data-tooltip': 'Delete this time entry',
                                            onClick: () => deleteLog(projects.indexOf(p), i)
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
                    archivedProjects.length > 0 && React.createElement('div', { style: { marginTop: 32 } },
                        React.createElement('button', {
                            className: 'btn',
                            style: { width: '100%', background: '#f3f3f3', color: '#888', marginBottom: 8 },
                            onClick: () => setArchivedOpen(open => !open),
                            'data-tooltip': archivedOpen ? 'Hide archived projects' : 'Show your archived projects'
                        },
                            archivedOpen ? 'Hide Archived Projects' : `Show Archived Projects (${archivedProjects.length})`
                        ),
                        archivedOpen && archivedProjects.map((p, idx) =>
                            React.createElement('div', { key: idx, className: 'project', style: { opacity: 0.7 } },
                                React.createElement('div', { className: 'project-header' },
                                    React.createElement('span', { className: 'project-name' }, p.name),
                                    React.createElement('button', {
                                        className: 'btn unarchive-btn',
                                        onClick: () => unarchiveProject(projects.indexOf(p)),
                                        title: 'Unarchive project',
                                        'data-tooltip': 'Restore this project',
                                        style: { marginLeft: 4 }
                                    },
                                        React.createElement('i', { className: 'bi bi-arrow-up-square', style: { fontSize: '20px', color: '#374151' } })
                                    ),
                                    React.createElement('button', {
                                        className: 'btn delete-btn-square',
                                        onClick: () => deleteProject(projects.indexOf(p)),
                                        title: 'Delete project',
                                        style: { marginLeft: 4 }
                                    },
                                        React.createElement('i', { className: 'bi bi-trash', style: { fontSize: '20px', color: '#374151' } })
                                    )
                                ),
                                p.logs.length > 0 && React.createElement('ul', { className: 'log-list' },
                                    p.logs.map((log, i) =>
                                        React.createElement('li', { key: i, className: 'log-item indented' },
                                            React.createElement('button', {
                                                className: 'delete-log-btn',
                                                title: 'Delete entry',
                                                onClick: () => deleteLog(projects.indexOf(p), i)
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
                        React.createElement('label', { style: { fontWeight: 500, display: 'block', marginBottom: 8, textAlign: 'center' } }, 'Select Projects:'),
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
                                className: (selectedProjects.length === 0 || (selectedProjects.length === 1 && selectedProjects[0] === 'all')
                                    ? 'project-tag selected'
                                    : 'project-tag') + ' tooltip-wide',
                                onClick: () => setSelectedProjects(['all']),
                                'data-tooltip': 'Show data from all active projects'
                            }, 'All projects'),

                            // Individual project options sorted alphabetically
                            [...activeProjects]
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map(p =>
                                    React.createElement('div', {
                                        key: p.name,
                                        className: (selectedProjects.includes(p.name) ? 'project-tag selected' : 'project-tag') + ' tooltip-wide',
                                        onClick: () => {
                                            // If "all" is selected, clear it first
                                            const currentSelected = selectedProjects.filter(proj => proj !== 'all');

                                            if (currentSelected.includes(p.name)) {
                                                // Remove the project if already selected
                                                setSelectedProjects(
                                                    currentSelected.filter(proj => proj !== p.name)
                                                );
                                            } else {
                                                // Add the project to selection
                                                setSelectedProjects([...currentSelected, p.name]);
                                            }
                                        },
                                        'data-tooltip': selectedProjects.includes(p.name)
                                            ? `Click to remove ${p.name} from selection`
                                            : `Click to add ${p.name} to selection`
                                    }, p.name)
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
                                monthData.projectCount
                            ),
                            React.createElement('div', { style: { color: '#888', fontSize: '1rem' } }, 'Projects worked on')
                        )
                    ),
                    // Charts
                    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center' } },
                        React.createElement('div', { style: { width: '100%', maxWidth: "90%" } },
                            React.createElement('canvas', { id: 'days-bar-chart', height: 220 })
                        ),
                        React.createElement('div', { style: { width: '100%', maxWidth: "90%" } },
                            React.createElement('canvas', { id: 'projects-bar-chart', height: 220 })
                        )
                    ),
                    React.createElement('div', { style: { width: '100%', display: 'flex', justifyContent: 'center', marginTop: 32 } },
                        React.createElement('button', {
                            className: 'btn tooltip-wide',
                            onClick: exportPDF,
                            'data-tooltip': 'Create a PDF report with charts and data'
                        }, 'Export PDF')
                    )
                )
            )
        )
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App)); 