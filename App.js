// Refactored Minimalist Time Logger App
const { useState, useEffect } = React;

// Import components and utilities
import { Header } from './components/Header.js';
import { InfoDialog } from './components/InfoDialog.js';
import { DemoBanner, DemoModeBanner } from './components/DemoBanner.js';
import { TabBar } from './components/TabBar.js';
import { GroupList } from './components/GroupList.js';
import { ReportTab } from './components/ReportTab.js';
import { Footer } from './components/Footer.js';

// Import hooks
import { useTimer } from './components/hooks/useTimer.js';
import { useLocalStorage } from './components/hooks/useLocalStorage.js';
import { useFirebaseSync } from './components/hooks/useFirebaseSync.js';


// Import utilities
import { exportJSON, exportCSV, importJSON, exportPDF, exportReportCSV } from './components/exportUtils.js';

function App() {
    // Authentication state
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Use custom hooks
    const { forceUpdate } = useTimer();
    const {
        groups,
        setGroups,
        loading,
        demoBanner,
        setDemoBanner,
        demoMode,
        setDemoMode,
        enterDemoMode,
        exitDemoMode
    } = useLocalStorage();

    // Firebase sync
    const { isLoading: syncLoading, syncError } = useFirebaseSync(user, groups, setGroups);

    // Authentication functions
    const handleSignIn = async () => {
        if (!window.firebaseAuth) {
            alert('Firebase not configured. Please set up Firebase to enable sign-in.');
            return;
        }

        try {
            const provider = new window.firebase.auth.GoogleAuthProvider();
            await window.firebaseAuth.signInWithPopup(provider);
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    };

    const handleSignOut = async () => {
        if (!window.firebaseAuth) return;

        try {
            await window.firebaseAuth.signOut();
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    };

    // Listen for authentication state changes
    useEffect(() => {
        if (!window.firebaseAuth) {
            setAuthLoading(false);
            return;
        }

        const unsubscribe = window.firebaseAuth.onAuthStateChanged((user) => {
            setUser(user);
            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // State for UI components
    const [infoOpen, setInfoOpen] = useState(false);
    const [tab, setTab] = useState('log');
    const [reportMonth, setReportMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [logMonth, setLogMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [selectedGroups, setSelectedGroups] = useState(['all']);

    // When switching to report tab, default to all active groups if none selected
    useEffect(() => {
        if (tab === 'report' && selectedGroups.length === 0) {
            setSelectedGroups(['all']);
        }
    }, [tab, selectedGroups]);


    // Timer functions
    const startTimer = (idx) => {
        const newGroups = [...groups];
        // Stop any other running timers
        newGroups.forEach(g => g.running = false);
        newGroups[idx].running = true;
        newGroups[idx].startedAt = Date.now();
        setGroups(newGroups);
    };

    const stopTimer = (idx) => {
        const newGroups = [...groups];
        const group = newGroups[idx];
        if (group.running) {
            const duration = Math.floor((Date.now() - group.startedAt) / 1000);
            group.logs.push({
                start: new Date(group.startedAt).toISOString(),
                end: new Date().toISOString(),
                duration
            });
            group.running = false;
            delete group.startedAt;
        }
        setGroups(newGroups);
    };

    // Group management functions
    const addGroup = (name) => {
        setGroups([...groups, { name, logs: [], running: false, archived: false }]);
    };

    const deleteGroup = (idx) => {
        if (confirm('Delete this group and all its time entries?')) {
            setGroups(groups.filter((_, i) => i !== idx));
        }
    };

    const archiveGroup = (idx) => {
        const newGroups = [...groups];
        newGroups[idx].archived = true;
        newGroups[idx].running = false;
        setGroups(newGroups);
    };

    const unarchiveGroup = (idx) => {
        const newGroups = [...groups];
        newGroups[idx].archived = false;
        setGroups(newGroups);
    };

    // Entry management functions
    const addManualEntry = (groupIdx, entry) => {
        const newGroups = [...groups];
        newGroups[groupIdx].logs.push(entry);
        setGroups(newGroups);
    };

    const editEntry = (groupIdx, logIdx, updatedEntry) => {
        const newGroups = [...groups];
        newGroups[groupIdx].logs[logIdx] = updatedEntry;
        setGroups(newGroups);
    };

    const deleteEntry = (groupIdx, logIdx) => {
        if (confirm('Delete this time entry?')) {
            const newGroups = [...groups];
            newGroups[groupIdx].logs.splice(logIdx, 1);
            setGroups(newGroups);
        }
    };

    // Export/Import handlers
    const handleExportJSON = () => exportJSON(groups);
    const handleExportCSV = () => exportCSV(groups);
    const handleImportJSON = (event) => importJSON(event, setGroups);
    const handleExportPDF = () => exportPDF(groups, selectedGroups, reportMonth);
    const handleExportReportCSV = () => exportReportCSV(groups, selectedGroups, reportMonth);

    // Info dialog handler
    const toggleInfo = () => setInfoOpen(open => !open);


    return (
        React.createElement('div', { className: 'container' },
            // Demo banners
            demoBanner && !loading && React.createElement(DemoBanner, { onEnterDemo: enterDemoMode }),
            demoMode && React.createElement(DemoModeBanner, { onExitDemo: exitDemoMode }),

            // Header
            React.createElement(Header, {
                onExportJSON: handleExportJSON,
                onImportJSON: handleImportJSON,
                onExportCSV: handleExportCSV,
                onToggleInfo: toggleInfo,
                user,
                onSignIn: handleSignIn,
                onSignOut: handleSignOut,
                authLoading
            }),

            // Info dialog
            React.createElement(InfoDialog, {
                isOpen: infoOpen,
                onClose: toggleInfo
            }),

            // Tab navigation
            React.createElement(TabBar, {
                activeTab: tab,
                onTabChange: setTab
            }),

            // Tab content
            tab === 'log' && React.createElement(GroupList, {
                groups,
                onStartTimer: startTimer,
                onStopTimer: stopTimer,
                onAddGroup: addGroup,
                onDeleteGroup: deleteGroup,
                onArchiveGroup: archiveGroup,
                onUnarchiveGroup: unarchiveGroup,
                onAddManualEntry: addManualEntry,
                onEditEntry: editEntry,
                onDeleteEntry: deleteEntry,
                loading,
                logMonth,
                onLogMonthChange: setLogMonth
            }),

            tab === 'report' && React.createElement(ReportTab, {
                groups,
                selectedGroups,
                onSelectedGroupsChange: setSelectedGroups,
                reportMonth,
                onReportMonthChange: setReportMonth,
                onExportPDF: handleExportPDF,
                onExportReportCSV: handleExportReportCSV
            })
        )
    );
}

// Render the app
ReactDOM.createRoot(document.getElementById('root')).render(
    React.createElement(
        React.Fragment,
        null,
        React.createElement(App),
        React.createElement(Footer)
    )
); 