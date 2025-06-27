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
    loading
}) {
    const [newGroup, setNewGroup] = useState('');
    const [manualIdx, setManualIdx] = useState(null);
    const [manualForm, setManualForm] = useState({ date: '', start: '', end: '' });
    const [editingLog, setEditingLog] = useState(null);
    const [editForm, setEditForm] = useState({ date: '', start: '', end: '' });
    const [archivedOpen, setArchivedOpen] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState(new Set());

    const activeGroups = groups.filter(g => !g.archived);
    const archivedGroups = groups.filter(g => g.archived);
    const overlapping = findOverlappingLogs(groups);

    const addGroup = (e) => {
        e.preventDefault();
        if (newGroup.trim()) {
            onAddGroup(newGroup.trim());
            setNewGroup('');
        }
    };

    const openManualForm = (idx) => {
        setManualIdx(idx);
        const today = new Date().toISOString().split('T')[0];
        setManualForm({ date: today, start: '', end: '' });
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
                'data-tooltip': 'Create a new group'
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
                'data-tooltip': 'Collapse all groups to hide their time entries',
                style: { fontSize: '0.9rem', padding: '6px 14px' }
            }, 'Fold All'),
            React.createElement('button', {
                className: 'btn',
                onClick: unfoldAllGroups,
                'data-tooltip': 'Expand all groups to show their time entries',
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
                        'data-tooltip': collapsedGroups.has(g.name) ? 'Expand group to show time entries' : 'Collapse group to hide time entries',
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
                        onClick: g.running ? () => onStopTimer(groups.indexOf(g)) : () => onStartTimer(groups.indexOf(g)),
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
                        onClick: () => onArchiveGroup(groups.indexOf(g)),
                        'data-tooltip': 'Archive this group',
                        title: 'Archive group',
                        style: { marginLeft: 4 }
                    },
                        React.createElement('i', { className: 'bi bi-archive', style: { fontSize: '20px', color: '#374151' } })
                    ),
                    React.createElement('button', {
                        className: 'btn delete-btn-square',
                        onClick: () => onDeleteGroup(groups.indexOf(g)),
                        'data-tooltip': 'Delete this group',
                        title: 'Delete group',
                        style: { marginLeft: 4 }
                    },
                        React.createElement('i', { className: 'bi bi-trash', style: { fontSize: '20px', color: '#374151' } })
                    )
                ),

                // Manual entry form
                !collapsedGroups.has(g.name) && manualIdx === groups.indexOf(g) && React.createElement('form', {
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
                        'data-tooltip': 'Save this time entry to the project'
                    }, 'Save'),
                    React.createElement('button', {
                        type: 'button',
                        className: 'btn tooltip-wide',
                        onClick: closeManualForm,
                        'data-tooltip': 'Cancel without saving this entry'
                    }, 'Cancel')
                ),

                // Time logs
                !collapsedGroups.has(g.name) && g.logs.length > 0 && React.createElement('ul', { className: 'log-list' },
                    g.logs.map((log, i) => {
                        if (editingLog && editingLog.groupIdx === groups.indexOf(g) && editingLog.logIdx === i) {
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
                                        'data-tooltip': 'Save changes to this entry'
                                    }, 'Save'),
                                    React.createElement('button', {
                                        type: 'button',
                                        className: 'btn tooltip-wide',
                                        onClick: closeEditForm,
                                        'data-tooltip': 'Cancel editing'
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
                                'data-tooltip': 'Edit this time entry',
                                onClick: () => openEditForm(groups.indexOf(g), i),
                                style: { marginLeft: '8px' }
                            }, '✎'),
                            React.createElement('button', {
                                className: 'log-action-btn delete-log-btn',
                                title: 'Delete entry',
                                'data-tooltip': 'Delete this time entry',
                                onClick: () => onDeleteEntry(groups.indexOf(g), i)
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
                            onClick: () => onUnarchiveGroup(groups.indexOf(g)),
                            title: 'Unarchive group',
                            'data-tooltip': 'Restore this group',
                            style: { marginLeft: 4 }
                        },
                            React.createElement('i', { className: 'bi bi-arrow-up-square', style: { fontSize: '20px', color: '#374151' } })
                        ),
                        React.createElement('button', {
                            className: 'btn delete-btn-square',
                            onClick: () => onDeleteGroup(groups.indexOf(g)),
                            'data-tooltip': 'Delete this group',
                            title: 'Delete group',
                            style: { marginLeft: 4 }
                        },
                            React.createElement('i', { className: 'bi bi-trash', style: { fontSize: '20px', color: '#374151' } })
                        )
                    ),
                    g.logs.length > 0 && React.createElement('ul', { className: 'log-list' },
                        g.logs.map((log, i) => {
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
                                    'data-tooltip': 'Edit this time entry',
                                    onClick: () => openEditForm(groups.indexOf(g), i),
                                    style: { marginLeft: '8px' }
                                }, '✎'),
                                React.createElement('button', {
                                    className: 'log-action-btn delete-log-btn',
                                    title: 'Delete entry',
                                    'data-tooltip': 'Delete this time entry',
                                    onClick: () => onDeleteEntry(groups.indexOf(g), i)
                                }, '\u00D7')
                            );
                        })
                    )
                )
            )
        )
    );
} 