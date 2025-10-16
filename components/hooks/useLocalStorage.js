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
    // Note: Firebase sync will handle cloud storage when user is authenticated
    useEffect(() => {
        if (!loading) {
            localStorage.setItem('groups', JSON.stringify(groups));
        }
    }, [groups, loading]);

    // Generate demo data with current month timestamps
    const generateDemoData = () => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-indexed

        // Helper function to create a specific date within the current month
        const getSpecificDateInCurrentMonth = (day, hour) => {
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            const safeDay = Math.min(day, daysInMonth); // Ensure day exists in the month
            return new Date(currentYear, currentMonth, safeDay, hour, 0, 0);
        };

        // Helper function to create a time log entry with specific timing
        const createSpecificLogEntry = (day, startHour, durationHours) => {
            const start = getSpecificDateInCurrentMonth(day, startHour);
            const end = new Date(start.getTime() + (durationHours * 60 * 60 * 1000));
            return {
                start: start.toISOString(),
                end: end.toISOString(),
                duration: durationHours * 3600 // duration in seconds
            };
        };

        // Helper function to create a random time log entry (for non-overlapping entries)
        const createRandomLogEntry = (durationHours) => {
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            const randomDay = Math.floor(Math.random() * daysInMonth) + 1;
            const randomHour = Math.floor(Math.random() * 9) + 8; // 8-16 (8am-4pm)
            const start = new Date(currentYear, currentMonth, randomDay, randomHour, 0, 0);
            const end = new Date(start.getTime() + (durationHours * 60 * 60 * 1000));
            return {
                start: start.toISOString(),
                end: end.toISOString(),
                duration: durationHours * 3600
            };
        };

        return [
            {
                name: "PKSim Model Development",
                logs: [
                    createSpecificLogEntry(5, 9, 3), // Day 5, 9:00-12:00 (3 hours)
                    createRandomLogEntry(2)
                ],
                running: false,
                startedAt: null,
                archived: false
            },
            {
                name: "Data Analysis - Clinical Trial",
                logs: [
                    createSpecificLogEntry(5, 10, 2), // Day 5, 10:00-12:00 (2 hours) - OVERLAPS with PKSim (10:00-12:00)
                    createRandomLogEntry(2)
                ],
                running: false,
                startedAt: null,
                archived: false
            },
            {
                name: "Parameter Optimization",
                logs: [
                    createRandomLogEntry(2),
                    createRandomLogEntry(2)
                ],
                running: false,
                startedAt: null,
                archived: false
            },
            {
                name: "Literature Review",
                logs: [
                    createRandomLogEntry(2),
                    createRandomLogEntry(1)
                ],
                running: false,
                startedAt: null,
                archived: false
            },
            {
                name: "Scientific Manuscript Writing",
                logs: [
                    createRandomLogEntry(2),
                    createRandomLogEntry(3)
                ],
                running: false,
                startedAt: null,
                archived: false
            },
            {
                name: "Team Meetings",
                logs: [
                    createRandomLogEntry(1),
                    createRandomLogEntry(1)
                ],
                running: false,
                startedAt: null,
                archived: false
            },
            {
                name: "Sensitivity Analysis",
                logs: [
                    createRandomLogEntry(1),
                    createRandomLogEntry(2)
                ],
                running: false,
                startedAt: null,
                archived: false
            },
            {
                name: "Biomarker Simulation",
                logs: [
                    createRandomLogEntry(2),
                    createRandomLogEntry(2)
                ],
                running: false,
                startedAt: null,
                archived: false
            },
            {
                name: "PK/PD Workshop Prep",
                logs: [
                    createRandomLogEntry(2),
                    createRandomLogEntry(1)
                ],
                running: false,
                startedAt: null,
                archived: false
            },
            {
                name: "Grant Writing",
                logs: [
                    createRandomLogEntry(2)
                ],
                running: false,
                startedAt: null,
                archived: false
            },
            {
                name: "Pediatric PBPK Study",
                logs: [
                    createRandomLogEntry(1)
                ],
                running: false,
                startedAt: null,
                archived: true
            },
            {
                name: "Legacy Model Conversion",
                logs: [
                    createRandomLogEntry(2)
                ],
                running: false,
                startedAt: null,
                archived: true
            }
        ];
    };

    // Demo mode functions
    const enterDemoMode = () => {
        // Clear any existing data first to ensure fresh demo data generation
        localStorage.removeItem('groups');

        const demoGroups = generateDemoData();
        setGroups(demoGroups);
        setDemoBanner(false);
        setDemoMode(true);
        localStorage.setItem('demoMode', 'true');
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