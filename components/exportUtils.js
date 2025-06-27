// Export utilities for JSON, CSV, and PDF
import { getMonthData, formatDurationHM } from './utils.js';

// Export data as JSON file
export function exportJSON(groups) {
    const blob = new Blob([JSON.stringify(groups, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-logger-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Export data as CSV file
export function exportCSV(groups) {
    let csv = 'Group,Start,End,Duration(seconds),Date\n';
    groups.forEach(group => {
        group.logs.forEach(log => {
            const start = new Date(log.start);
            const end = new Date(log.end);
            csv += `"${group.name}","${start.toISOString()}","${end.toISOString()}",${log.duration},"${start.toDateString()}"\n`;
        });
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-logger-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Import JSON data
export function importJSON(event, onSuccess) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported) && imported.every(g => g.name && Array.isArray(g.logs))) {
                onSuccess(imported);
            } else {
                alert('Invalid JSON format. Expected an array of groups with name and logs properties.');
            }
        } catch (error) {
            alert('Invalid JSON file: ' + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// Export report as PDF
export async function exportPDF(groups, selectedGroups, reportMonth) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const monthData = getMonthData(groups, selectedGroups, reportMonth);
    const monthName = new Date(reportMonth + '-01').toLocaleString(undefined, { month: 'long', year: 'numeric' });

    // Title
    doc.setFontSize(20);
    doc.text('Time Logger Report', 20, 20);

    // Month
    doc.setFontSize(16);
    doc.text(`Month: ${monthName}`, 20, 35);

    // Summary
    doc.setFontSize(12);
    doc.text(`Total Time: ${formatDurationHM(monthData.totalSeconds)}`, 20, 50);
    doc.text(`Groups Worked On: ${monthData.groupCount}`, 20, 60);

    // Group breakdown
    doc.text('Group Breakdown:', 20, 80);
    let yPos = 90;

    Object.entries(monthData.groupTotals)
        .sort(([, a], [, b]) => b - a)
        .forEach(([groupName, seconds]) => {
            doc.text(`${groupName}: ${formatDurationHM(seconds)}`, 25, yPos);
            yPos += 10;
        });

    // Daily breakdown
    if (yPos < 200) {
        doc.text('Daily Breakdown:', 20, yPos + 20);
        yPos += 30;

        Object.entries(monthData.days)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([date, seconds]) => {
                if (yPos > 250) {
                    doc.addPage();
                    yPos = 20;
                }
                const dateObj = new Date(date);
                doc.text(`${dateObj.toLocaleDateString()}: ${formatDurationHM(seconds)}`, 25, yPos);
                yPos += 10;
            });
    }

    doc.save(`time-report-${reportMonth}.pdf`);
}

// Export report data as CSV
export function exportReportCSV(groups, selectedGroups, reportMonth) {
    const monthData = getMonthData(groups, selectedGroups, reportMonth);
    const [year, month] = reportMonth.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const selectedProjs = selectedGroups || ['all'];
    const isAllSelected = selectedProjs.length === 0 || (selectedProjs.length === 1 && selectedProjs[0] === 'all');

    const filteredGroups = isAllSelected
        ? groups.filter(g => !g.archived)
        : groups.filter(g => !g.archived && selectedProjs.includes(g.name));

    let csv = 'Group,Start,End,Duration(seconds),Date,Hours\n';

    filteredGroups.forEach(group => {
        group.logs.forEach(log => {
            const logStart = new Date(log.start);
            const logEnd = new Date(log.end);

            if (logStart >= monthStart && logStart <= monthEnd) {
                const hours = (log.duration / 3600).toFixed(2);
                csv += `"${group.name}","${logStart.toISOString()}","${logEnd.toISOString()}",${log.duration},"${logStart.toDateString()}",${hours}\n`;
            }
        });
    });

    const monthName = new Date(reportMonth + '-01').toLocaleString(undefined, { month: 'long', year: 'numeric' }).replace(' ', '-');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-report-${monthName}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
} 