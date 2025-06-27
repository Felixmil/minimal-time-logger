// Utility functions for the Time Logger App

// Format duration in seconds to HH:MM:SS format
export function formatDuration(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Format duration in seconds to HH:MM format (no seconds)
export function formatDurationNoSeconds(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
}

// Format duration in seconds to HH:MM format with 'h' suffix
export function formatDurationHM(sec) {
    return formatDurationNoSeconds(sec) + 'h';
}

// Format date to HH:MM format
export function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Calculate total time for a group including running timer
export function getTotalGroupTime(group) {
    let total = group.logs.reduce((sum, log) => sum + log.duration, 0);
    if (group.running) total += Math.floor((Date.now() - group.startedAt) / 1000);
    return total;
}

// Find overlapping time entries across all groups
export function findOverlappingLogs(groups) {
    const overlapping = [];
    const allLogs = [];

    groups.forEach(group => {
        group.logs.forEach(log => {
            allLogs.push({ ...log, group: group.name });
        });
    });

    // Sort logs by start time
    allLogs.sort((a, b) => new Date(a.start) - new Date(b.start));

    // Check for overlaps
    for (let i = 0; i < allLogs.length - 1; i++) {
        for (let j = i + 1; j < allLogs.length; j++) {
            const first = allLogs[i];
            const second = allLogs[j];

            const firstStart = new Date(first.start);
            const firstEnd = new Date(first.end);
            const secondStart = new Date(second.start);
            const secondEnd = new Date(second.end);

            // Check if they overlap
            if (firstStart < secondEnd && secondStart < firstEnd) {
                overlapping.push({ first, second });
            }
        }
    }

    return overlapping;
}

// Get month data for reporting
export function getMonthData(groups, selectedGroups, reportMonth) {
    const [year, month] = reportMonth.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const selectedProjs = selectedGroups || ['all'];
    const isAllSelected = selectedProjs.length === 0 || (selectedProjs.length === 1 && selectedProjs[0] === 'all');

    // Filter groups based on selection
    const filteredGroups = isAllSelected
        ? groups.filter(g => !g.archived)
        : groups.filter(g => !g.archived && selectedProjs.includes(g.name));

    let totalSeconds = 0;
    const days = {};
    const groupTotals = {};

    filteredGroups.forEach(group => {
        let groupTotal = 0;
        group.logs.forEach(log => {
            const logStart = new Date(log.start);
            const logEnd = new Date(log.end);

            // Check if log is within the selected month
            if (logStart >= monthStart && logStart <= monthEnd) {
                totalSeconds += log.duration;
                groupTotal += log.duration;

                // Add to days
                const dayKey = logStart.toISOString().split('T')[0]; // YYYY-MM-DD
                days[dayKey] = (days[dayKey] || 0) + log.duration;
            }
        });
        if (groupTotal > 0) {
            groupTotals[group.name] = groupTotal;
        }
    });

    return {
        totalSeconds,
        days,
        groupTotals,
        groupCount: Object.keys(groupTotals).length
    };
}

// Auto-detect GitHub Pages environment
export function isGitHubPages() {
    return window.location.hostname.endsWith('github.io');
}

// Check development mode
export function getDevMode() {
    return !isGitHubPages() && true; // Set to false for production
} 