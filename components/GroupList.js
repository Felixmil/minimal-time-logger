// Group list component with time tracking functionality
const { useState } = React;
import { formatDuration, formatTime, formatDurationNoSeconds, getTotalGroupTime, findOverlappingLogs } from './utils.js';

export function GroupList({
    groups,
    onStartTimer,
    onStopTimer,
    onAddGroup,
    onDeleteGroup,
    onArchiveGroup,
    onUnarchiveGroup,
    onAddManualEntry,
    onEditEntry,
    onDeleteEntry,
    loading,
    logMonth,
    onLogMonthChange
}) {
    const [newGroup, setNewGroup] = useState('');
    const [manualIdx, setManualIdx] = useState(null);
    const [manualForm, setManualForm] = useState({ date: '', start: '', end: '' });
    const [editingLog, setEditingLog] = useState(null);
    const [editForm, setEditForm] = useState({ date: '', start: '', end: '' });

    // Helper function to get the correct group index
    const getGroupIndex = (group) => {
        const index = groups.findIndex(g => g.name === group.name);
        if (index === -1) {
            console.error('Group not found in getGroupIndex:', {
                groupName: group.name,
                availableGroups: groups.map(g => g.name),
                groupObject: group
            });
        }
        return index;
    };

    // Create a mapping from activeGroups to original groups
    const getOriginalGroupIndex = (activeGroup) => {
        return groups.findIndex(g => g.name === activeGroup.name);
    };
    const [archivedOpen, setArchivedOpen] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState(new Set());

    // Filter logs by month
    const filterLogsByMonth = (logs) => {
        const [year, month] = logMonth.split('-').map(Number);
        return logs.filter(log => {
            const logDate = new Date(log.start);
            return logDate.getFullYear() === year && logDate.getMonth() === month - 1;
        });
    };

    // Filter groups to show only non-archived groups, but include all groups that have entries in the selected month
    const getFilteredGroups = () => {
        const nonArchivedGroups = groups.filter(g => !g.archived);
        const groupsWithEntriesInMonth = nonArchivedGroups.map(group => ({
            ...group,
            logs: filterLogsByMonth(group.logs)
        }));

        // Show all non-archived groups, even if they have no entries in the selected month
        return groupsWithEntriesInMonth;
    };

    // Filter archived groups to show all archived groups, but filter their entries by month
    const getFilteredArchivedGroups = () => {
        const archivedGroups = groups.filter(g => g.archived);
        const archivedGroupsWithFilteredEntries = archivedGroups.map(group => ({
            ...group,
            logs: filterLogsByMonth(group.logs)
        }));

        // Show all archived groups, even if they have no entries in the selected month
        return archivedGroupsWithFilteredEntries;
    };

    const filteredGroups = getFilteredGroups();
    const activeGroups = filteredGroups;
    const archivedGroups = getFilteredArchivedGroups();
    const overlapping = findOverlappingLogs(filteredGroups);

    const addGroup = (e) => {
        e.preventDefault();
        if (newGroup.trim()) {
            onAddGroup(newGroup.trim());
            setNewGroup('');
        }
    };

    const openManualForm = (idx) => {
        setManualIdx(idx);
        // Default to first day of selected month, or today if it's the current month
        const [year, month] = logMonth.split('-').map(Number);
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month - 1;
        const defaultDate = isCurrentMonth ? today.toISOString().split('T')[0] : `${year}-${String(month).padStart(2, '0')}-01`;
        setManualForm({ date: defaultDate, start: '', end: '' });
    };

    const closeManualForm = () => {
        setManualIdx(null);
        setManualForm({ date: '', start: '', end: '' });
    };

    const handleManualChange = (e) => {
        setManualForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const submitManualEntry = (e) => {
        e.preventDefault();
        const { date, start, end } = manualForm;
        const startTime = new Date(`${date}T${start}`);
        const endTime = new Date(`${date}T${end}`);

        if (endTime <= startTime) {
            alert('End time must be after start time');
            return;
        }

        const duration = Math.floor((endTime - startTime) / 1000);
        onAddManualEntry(manualIdx, {
            start: startTime.toISOString(),
            end: endTime.toISOString(),
            duration
        });
        closeManualForm();
    };

    const openEditForm = (groupIdx, logIdx) => {
        if (groupIdx < 0 || groupIdx >= groups.length) {
            console.error('Invalid group index for openEditForm:', groupIdx);
            return;
        }

        if (!groups[groupIdx]) {
            console.error('Group not found at index for openEditForm:', groupIdx);
            return;
        }

        if (!groups[groupIdx].logs || logIdx < 0 || logIdx >= groups[groupIdx].logs.length) {
            console.error('Invalid log index for openEditForm:', logIdx);
            return;
        }

        const log = groups[groupIdx].logs[logIdx];
        const startDate = new Date(log.start);
        const endDate = new Date(log.end);

        setEditingLog({ groupIdx, logIdx });
        setEditForm({
            date: startDate.toISOString().split('T')[0],
            start: startDate.toTimeString().slice(0, 5),
            end: endDate.toTimeString().slice(0, 5)
        });
    };

    const closeEditForm = () => {
        setEditingLog(null);
        setEditForm({ date: '', start: '', end: '' });
    };

    const handleEditChange = (e) => {
        setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const submitLogEdit = (e) => {
        e.preventDefault();
        const { date, start, end } = editForm;
        const startTime = new Date(`${date}T${start}`);
        const endTime = new Date(`${date}T${end}`);

        if (endTime <= startTime) {
            alert('End time must be after start time');
            return;
        }

        const duration = Math.floor((endTime - startTime) / 1000);
        onEditEntry(editingLog.groupIdx, editingLog.logIdx, {
            start: startTime.toISOString(),
            end: endTime.toISOString(),
            duration
        });
        closeEditForm();
    };

    const toggleGroupCollapse = (groupName) => {
        setCollapsedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupName)) {
                newSet.delete(groupName);
            } else {
                newSet.add(groupName);
            }
            return newSet;
        });
    };

    const foldAllGroups = () => {
        setCollapsedGroups(new Set(activeGroups.map(g => g.name)));
    };

    const unfoldAllGroups = () => {
        setCollapsedGroups(new Set());
    };

    const changeMonth = (offset) => {
        const [year, month] = logMonth.split('-').map(Number);
        const newDate = new Date(year, month - 1 + offset, 1);
        const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
        onLogMonthChange(newMonth);
    };

    return React.createElement('div', null,
        // Overlapping warning
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
                overlapping.map((o, i) => {
                    const firstStart = new Date(o.first.start);
                    const firstEnd = new Date(o.first.end);
                    const secondStart = new Date(o.second.start);
                    const secondEnd = new Date(o.second.end);

                    const formatDateTime = (date) => {
                        return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
                    };

                    return React.createElement('li', { key: i, style: { marginBottom: '8px' } },
                        React.createElement('div', { style: { fontWeight: '500', marginBottom: '4px' } }, 'Overlapping entries:'),
                        React.createElement('div', { style: { paddingLeft: '16px', marginBottom: '2px' } },
                            `Group: ${o.first.group} — ${formatDateTime(firstStart)} - ${firstEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
                        ),
                        React.createElement('div', { style: { paddingLeft: '16px' } },
                            `Group: ${o.second.group} — ${formatDateTime(secondStart)} - ${secondEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
                        )
                    );
                })
            )
        ),

        // Month navigation
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 18 } },
            React.createElement('button', {
                className: 'btn tooltip-wide',
                onClick: () => changeMonth(-1),
            }, '\u25C0'),
            React.createElement('span', { style: { fontWeight: 500, fontSize: '1.1rem' } },
                new Date(logMonth + '-01').toLocaleString(undefined, { month: 'long', year: 'numeric' })
            ),
            React.createElement('button', {
                className: 'btn tooltip-wide',
                onClick: () => changeMonth(1),
            }, '\u25B6')
        ),

        // Add group form
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
            }, 'Add')
        ),

        // Fold/Unfold buttons
        activeGroups.length > 0 && React.createElement('div', {
            style: {
                display: 'flex',
                gap: 8,
                justifyContent: 'center',
                marginBottom: 16
            }
        },
            React.createElement('button', {
                className: 'btn',
                onClick: foldAllGroups,
                style: { fontSize: '0.9rem', padding: '6px 14px' }
            }, 'Fold All'),
            React.createElement('button', {
                className: 'btn',
                onClick: unfoldAllGroups,
                style: { fontSize: '0.9rem', padding: '6px 14px' }
            }, 'Unfold All')
        ),

        // Loading state
        loading
            ? React.createElement('p', { className: 'empty' }, 'Loading...')
            : activeGroups.length === 0 && React.createElement('p', { className: 'empty' }, 'No groups yet.'),

        // Active groups
        activeGroups.length > 0 && activeGroups.map((g, idx) =>
            React.createElement('div', { key: idx, className: 'project' },
                React.createElement('div', { className: 'project-header' },
                    React.createElement('button', {
                        className: 'btn toggle-collapse-btn',
                        onClick: () => toggleGroupCollapse(g.name),
                        style: {
                            background: 'none',
                            border: 'none',
                            padding: '4px 8px',
                            marginRight: '8px',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            color: '#666',
                            minWidth: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }
                    }, collapsedGroups.has(g.name) ? '▶' : '▼'),
                    React.createElement('span', { className: 'project-name', style: { flex: 1 } }, g.name),
                    React.createElement('button', {
                        className: 'btn play-btn' + (g.running ? ' running' : ''),
                        onClick: g.running ? () => {
                            const actualIndex = getOriginalGroupIndex(g);
                            onStopTimer(actualIndex);
                        } : () => {
                            const actualIndex = getOriginalGroupIndex(g);
                            onStartTimer(actualIndex);
                        },
                        'data-tooltip': g.running ? 'Stop the timer' : 'Start timing for this group',
                        title: g.running ? 'Stop timer' : 'Start timer'
                    },
                        g.running
                            ? formatDuration(Math.floor((Date.now() - g.startedAt) / 1000))
                            : React.createElement('i', { className: 'bi bi-play-fill', style: { color: '#1a7f4f' } })
                    ),
                    React.createElement('button', {
                        className: 'btn add-entry',
                        onClick: () => {
                            const actualIndex = getOriginalGroupIndex(g);
                            openManualForm(actualIndex);
                        },
                        'data-tooltip': 'Add a manual time entry',
                        title: 'Add manual entry',
                        style: { marginLeft: 4 }
                    }, React.createElement('i', { className: 'bi bi-plus', style: { fontSize: '20px', color: '#374151' } })),
                    React.createElement('button', {
                        className: 'btn archive-btn-square',
                        onClick: () => onArchiveGroup(getOriginalGroupIndex(g)),
                        'data-tooltip': 'Archive this group',
                        title: 'Archive group',
                        style: { marginLeft: 4 }
                    },
                        React.createElement('i', { className: 'bi bi-archive', style: { fontSize: '20px', color: '#374151' } })
                    ),
                    React.createElement('button', {
                        className: 'btn delete-btn-square',
                        onClick: () => onDeleteGroup(getOriginalGroupIndex(g)),
                        'data-tooltip': 'Delete this group',
                        title: 'Delete group',
                        style: { marginLeft: 4 }
                    },
                        React.createElement('i', { className: 'bi bi-trash', style: { fontSize: '20px', color: '#374151' } })
                    )
                ),

                // Manual entry form
                !collapsedGroups.has(g.name) && manualIdx === getOriginalGroupIndex(g) && React.createElement('form', {
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
                        step: 60,
                        style: { padding: 4 }
                    }),
                    React.createElement('input', {
                        type: 'time',
                        name: 'end',
                        value: manualForm.end,
                        onChange: handleManualChange,
                        required: true,
                        step: 60,
                        style: { padding: 4 }
                    }),
                    React.createElement('button', {
                        type: 'submit',
                        className: 'btn tooltip-wide',
                    }, 'Save'),
                    React.createElement('button', {
                        type: 'button',
                        className: 'btn tooltip-wide',
                        onClick: closeManualForm,
                    }, 'Cancel')
                ),

                // Time logs
                !collapsedGroups.has(g.name) && g.logs.length > 0 && React.createElement('ul', { className: 'log-list' },
                    g.logs.map((log, i) => {
                        if (editingLog && editingLog.groupIdx === getOriginalGroupIndex(g) && editingLog.logIdx === i) {
                            return React.createElement('li', { key: `edit-${i}`, className: 'log-item indented' },
                                React.createElement('form', {
                                    onSubmit: submitLogEdit,
                                    style: { display: 'flex', gap: 6, margin: '0', alignItems: 'center', justifyContent: 'center', width: '100%' }
                                },
                                    React.createElement('input', {
                                        type: 'date',
                                        name: 'date',
                                        value: editForm.date,
                                        onChange: handleEditChange,
                                        required: true,
                                        style: { padding: 4 }
                                    }),
                                    React.createElement('input', {
                                        type: 'time',
                                        name: 'start',
                                        value: editForm.start,
                                        onChange: handleEditChange,
                                        required: true,
                                        step: 60,
                                        style: { padding: 4 }
                                    }),
                                    React.createElement('input', {
                                        type: 'time',
                                        name: 'end',
                                        value: editForm.end,
                                        onChange: handleEditChange,
                                        required: true,
                                        step: 60,
                                        style: { padding: 4 }
                                    }),
                                    React.createElement('button', {
                                        type: 'submit',
                                        className: 'btn tooltip-wide',
                                    }, 'Save'),
                                    React.createElement('button', {
                                        type: 'button',
                                        className: 'btn tooltip-wide',
                                        onClick: closeEditForm,
                                    }, 'Cancel')
                                )
                            );
                        }

                        const startDate = new Date(log.start);
                        const endDate = new Date(log.end);
                        const sameDay = startDate.toDateString() === endDate.toDateString();
                        const logText = sameDay
                            ? `${startDate.toLocaleDateString([], { dateStyle: 'short' })} ${formatTime(startDate)} - ${formatTime(endDate)} (${formatDurationNoSeconds(log.duration)})`
                            : `${startDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short', hour12: false })} - ${endDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short', hour12: false })} (${formatDurationNoSeconds(log.duration)})`;

                        return React.createElement('li', { key: i, className: 'log-item indented', style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                            React.createElement('span', { className: 'log-text' }, logText),
                            React.createElement('button', {
                                className: 'log-action-btn edit-log-btn',
                                title: 'Edit entry',
                                onClick: () => openEditForm(getOriginalGroupIndex(g), i),
                                style: { marginLeft: '8px' }
                            }, '✎'),
                            React.createElement('button', {
                                className: 'log-action-btn delete-log-btn',
                                title: 'Delete entry',
                                onClick: () => onDeleteEntry(getOriginalGroupIndex(g), i)
                            }, '\u00D7')
                        );
                    })
                )
            )
        ),

        // Archived section
        archivedGroups.length > 0 && React.createElement('div', { style: { marginTop: 32 } },
            React.createElement('button', {
                className: 'btn',
                style: { width: '100%', background: '#f3f3f3', color: '#888', marginBottom: 8 },
                onClick: () => setArchivedOpen(open => !open),
            },
                archivedOpen ? 'Hide Archived Groups' : `Show Archived Groups (${archivedGroups.length})`
            ),
            archivedOpen && archivedGroups.map((g, idx) =>
                React.createElement('div', { key: idx, className: 'project', style: { opacity: 0.7 } },
                    React.createElement('div', { className: 'project-header' },
                        React.createElement('span', { className: 'project-name' }, g.name),
                        React.createElement('button', {
                            className: 'btn unarchive-btn',
                            onClick: () => onUnarchiveGroup(getOriginalGroupIndex(g)),
                            title: 'Unarchive group',
                            'data-tooltip': 'Restore this group',
                            style: { marginLeft: 4 }
                        },
                            React.createElement('i', { className: 'bi bi-arrow-up-square', style: { fontSize: '20px', color: '#374151' } })
                        ),
                        React.createElement('button', {
                            className: 'btn delete-btn-square',
                            onClick: () => onDeleteGroup(getOriginalGroupIndex(g)),
                            'data-tooltip': 'Delete this group',
                            title: 'Delete group',
                            style: { marginLeft: 4 }
                        },
                            React.createElement('i', { className: 'bi bi-trash', style: { fontSize: '20px', color: '#374151' } })
                        )
                    ),
                    g.logs.length > 0 && React.createElement('div', {
                        className: 'log-list',
                        style: {
                            padding: '8px 12px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '4px',
                            margin: '4px 0',
                            fontSize: '0.9rem',
                            color: '#6c757d'
                        }
                    },
                        `(${g.logs.length} ${g.logs.length === 1 ? 'entry' : 'entries'} in ${new Date(logMonth + '-01').toLocaleString(undefined, { month: 'long', year: 'numeric' })})`
                    )
                )
            )
        )
    );
} 