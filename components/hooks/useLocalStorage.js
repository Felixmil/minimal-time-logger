// Custom hook for localStorage persistence
const { useState, useEffect } = React;
import { getDevMode, isGitHubPages } from '../utils.js';

export function useLocalStorage() {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [demoBanner, setDemoBanner] = useState(false);
    const [demoMode, setDemoMode] = useState(false);

    // Load data from localStorage
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
        } else if (getDevMode() || isGitHubPages()) {
            setDemoBanner(true);
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

    // Demo mode functions
    const enterDemoMode = () => {
        const tryFetch = (paths) => {
            if (paths.length === 0) {
                console.warn('Could not load demo data from any source');
                return Promise.resolve([]);
            }

            const [currentPath, ...remainingPaths] = paths;

            return fetch(currentPath)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    return response.json();
                })
                .catch(error => {
                    console.warn(`Failed to load from ${currentPath}:`, error);
                    return tryFetch(remainingPaths);
                });
        };

        const demoPaths = [
            './demo-data.json',
            '/demo-data.json',
            `${window.location.origin}/demo-data.json`,
            '/minimal-time-logger/demo-data.json'
        ];

        tryFetch(demoPaths)
            .then(demoData => {
                if (demoData && demoData.length > 0) {
                    setGroups(demoData);
                    setDemoBanner(false);
                    setDemoMode(true);
                    localStorage.setItem('demoMode', 'true');
                }
            });
    };

    const exitDemoMode = () => {
        localStorage.removeItem('groups');
        localStorage.removeItem('demoMode');
        window.location.reload();
    };

    return {
        groups,
        setGroups,
        loading,
        demoBanner,
        setDemoBanner,
        demoMode,
        setDemoMode,
        enterDemoMode,
        exitDemoMode
    };
} 