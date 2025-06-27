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

    let yPos = 80;

    try {
        // Capture and add daily hours chart
        const daysChart = document.getElementById('days-bar-chart');
        if (daysChart) {
            const daysCanvas = await window.html2canvas(daysChart, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true
            });

            // Add chart title
            doc.setFontSize(14);
            doc.text('Daily Hours Chart:', 20, yPos);
            yPos += 15;

            // Calculate chart dimensions to fit on page
            const chartWidth = 170; // Max width for PDF
            const chartHeight = (daysCanvas.height * chartWidth) / daysCanvas.width;

            // Add chart image
            const daysImgData = daysCanvas.toDataURL('image/png');
            doc.addImage(daysImgData, 'PNG', 20, yPos, chartWidth, chartHeight);
            yPos += chartHeight + 20;
        }

        // Add new page for groups chart if needed
        if (yPos > 200) {
            doc.addPage();
            yPos = 20;
        }

        // Capture and add groups chart
        const groupsChart = document.getElementById('groups-bar-chart');
        if (groupsChart) {
            const groupsCanvas = await window.html2canvas(groupsChart, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true
            });

            // Add chart title
            doc.setFontSize(14);
            doc.text('Groups Hours Chart:', 20, yPos);
            yPos += 15;

            // Calculate chart dimensions
            const chartWidth = 170;
            const chartHeight = Math.min((groupsCanvas.height * chartWidth) / groupsCanvas.width, 200); // Limit max height

            // Add chart image
            const groupsImgData = groupsCanvas.toDataURL('image/png');
            doc.addImage(groupsImgData, 'PNG', 20, yPos, chartWidth, chartHeight);
            yPos += chartHeight + 20;
        }

        // Add new page for data breakdown
        doc.addPage();
        yPos = 20;

        // Group breakdown table
        doc.setFontSize(14);
        doc.text('Group Breakdown:', 20, yPos);
        yPos += 15;

        // Create group breakdown table
        const groupData = Object.entries(monthData.groupTotals)
            .sort(([, a], [, b]) => b - a)
            .map(([groupName, seconds]) => [
                groupName,
                (seconds / 3600).toFixed(2) + 'h'
            ]);

        if (groupData.length > 0) {
            // Table headers
            const groupHeaders = ['Group', 'Hours'];
            const groupTableConfig = {
                startY: yPos,
                head: [groupHeaders],
                body: groupData,
                theme: 'grid',
                styles: { fontSize: 10, cellPadding: 3 },
                headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                margin: { left: 20, right: 20 }
            };

            // Use jsPDF autoTable if available, otherwise fallback to simple table
            if (window.jspdf && window.jspdf.plugin && window.jspdf.plugin.autotable) {
                doc.autoTable(groupTableConfig);
                yPos = doc.lastAutoTable.finalY + 20;
            } else {
                // Simple table fallback
                doc.setFontSize(10);

                // Headers
                let tableX = 20;
                const colWidths = [120, 50];
                doc.setFont(undefined, 'bold');
                doc.text('Group', tableX, yPos);
                doc.text('Hours', tableX + colWidths[0], yPos);
                yPos += 10;

                // Draw header line
                doc.line(20, yPos - 2, 170, yPos - 2);
                yPos += 5;

                // Data rows
                doc.setFont(undefined, 'normal');
                groupData.forEach((row, index) => {
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }

                    // Alternate row background (simplified)
                    if (index % 2 === 1) {
                        doc.setFillColor(245, 245, 245);
                        doc.rect(20, yPos - 5, 150, 8, 'F');
                    }

                    doc.text(row[0].substring(0, 40), tableX, yPos); // Allow longer names
                    doc.text(row[1], tableX + colWidths[0], yPos);
                    yPos += 8;
                });

                yPos += 10;
            }
        }

        // Daily breakdown table
        if (yPos > 180) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.text('Daily Breakdown:', 20, yPos);
        yPos += 15;

        // Create daily breakdown table
        const dailyData = Object.entries(monthData.days)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, seconds]) => [
                new Date(date).toLocaleDateString(),
                new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                (seconds / 3600).toFixed(2) + 'h'
            ]);

        if (dailyData.length > 0) {
            // Table headers
            const dailyHeaders = ['Date', 'Day', 'Hours'];
            const dailyTableConfig = {
                startY: yPos,
                head: [dailyHeaders],
                body: dailyData,
                theme: 'grid',
                styles: { fontSize: 10, cellPadding: 3 },
                headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                margin: { left: 20, right: 20 }
            };

            // Use jsPDF autoTable if available, otherwise fallback to simple table
            if (window.jspdf && window.jspdf.plugin && window.jspdf.plugin.autotable) {
                doc.autoTable(dailyTableConfig);
            } else {
                // Simple table fallback
                doc.setFontSize(10);

                // Headers
                let tableX = 20;
                const colWidths = [70, 40, 50];
                doc.setFont(undefined, 'bold');
                doc.text('Date', tableX, yPos);
                doc.text('Day', tableX + colWidths[0], yPos);
                doc.text('Hours', tableX + colWidths[0] + colWidths[1], yPos);
                yPos += 10;

                // Draw header line
                doc.line(20, yPos - 2, 170, yPos - 2);
                yPos += 5;

                // Data rows
                doc.setFont(undefined, 'normal');
                dailyData.forEach((row, index) => {
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }

                    // Alternate row background (simplified)
                    if (index % 2 === 1) {
                        doc.setFillColor(245, 245, 245);
                        doc.rect(20, yPos - 5, 150, 8, 'F');
                    }

                    doc.text(row[0], tableX, yPos);
                    doc.text(row[1], tableX + colWidths[0], yPos);
                    doc.text(row[2], tableX + colWidths[0] + colWidths[1], yPos);
                    yPos += 8;
                });
            }
        }

    } catch (error) {
        console.error('Error capturing charts for PDF:', error);
        // Fallback to text-only PDF if chart capture fails
        doc.setFontSize(12);
        doc.text('(Charts could not be included in this export)', 20, yPos);
        yPos += 30;

        // Group breakdown table (fallback)
        doc.setFontSize(14);
        doc.text('Group Breakdown:', 20, yPos);
        yPos += 15;

        const groupData = Object.entries(monthData.groupTotals)
            .sort(([, a], [, b]) => b - a)
            .map(([groupName, seconds]) => [
                groupName,
                (seconds / 3600).toFixed(2) + 'h'
            ]);

        if (groupData.length > 0) {
            // Simple table implementation
            doc.setFontSize(10);

            // Headers
            let tableX = 20;
            const colWidths = [120, 50];
            doc.setFont(undefined, 'bold');
            doc.text('Group', tableX, yPos);
            doc.text('Hours', tableX + colWidths[0], yPos);
            yPos += 10;

            // Draw header line
            doc.line(20, yPos - 2, 170, yPos - 2);
            yPos += 5;

            // Data rows
            doc.setFont(undefined, 'normal');
            groupData.forEach((row, index) => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }

                // Alternate row background (simplified)
                if (index % 2 === 1) {
                    doc.setFillColor(245, 245, 245);
                    doc.rect(20, yPos - 5, 150, 8, 'F');
                }

                doc.text(row[0].substring(0, 40), tableX, yPos); // Allow longer names
                doc.text(row[1], tableX + colWidths[0], yPos);
                yPos += 8;
            });

            yPos += 10;
        }

        // Daily breakdown table (fallback)
        if (yPos > 200) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.text('Daily Breakdown:', 20, yPos);
        yPos += 15;

        const dailyData = Object.entries(monthData.days)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, seconds]) => [
                new Date(date).toLocaleDateString(),
                new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                (seconds / 3600).toFixed(2) + 'h'
            ]);

        if (dailyData.length > 0) {
            // Simple table implementation
            doc.setFontSize(10);

            // Headers
            let tableX = 20;
            const colWidths = [70, 40, 50];
            doc.setFont(undefined, 'bold');
            doc.text('Date', tableX, yPos);
            doc.text('Day', tableX + colWidths[0], yPos);
            doc.text('Hours', tableX + colWidths[0] + colWidths[1], yPos);
            yPos += 10;

            // Draw header line
            doc.line(20, yPos - 2, 170, yPos - 2);
            yPos += 5;

            // Data rows
            doc.setFont(undefined, 'normal');
            dailyData.forEach((row, index) => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }

                // Alternate row background (simplified)
                if (index % 2 === 1) {
                    doc.setFillColor(245, 245, 245);
                    doc.rect(20, yPos - 5, 150, 8, 'F');
                }

                doc.text(row[0], tableX, yPos);
                doc.text(row[1], tableX + colWidths[0], yPos);
                doc.text(row[2], tableX + colWidths[0] + colWidths[1], yPos);
                yPos += 8;
            });
        }
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