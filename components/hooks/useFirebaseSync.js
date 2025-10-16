// Firebase Sync Hook
const { useState, useEffect, useCallback } = React;

export function useFirebaseSync(user, groups, setGroups) {
    const [isLoading, setIsLoading] = useState(false);
    const [lastSync, setLastSync] = useState(null);
    const [syncError, setSyncError] = useState(null);

    // Check if Firebase is available
    const isFirebaseAvailable = () => {
        return window.firebaseAuth && window.firebaseDb;
    };

    // Save groups to Firestore
    const saveToFirestore = useCallback(async (groupsToSave) => {
        if (!user || !isFirebaseAvailable()) {
            console.log('Firebase sync skipped: user or Firebase not available', { user: !!user, firebase: isFirebaseAvailable() });
            return;
        }

        try {
            console.log('Starting Firebase sync for user:', user.uid);
            setIsLoading(true);
            setSyncError(null);

            const batch = window.firebaseDb.batch();
            const userRef = window.firebaseDb.collection('users').doc(user.uid);

            // Clear existing groups
            const existingGroups = await userRef.collection('groups').get();
            console.log('Found existing groups:', existingGroups.size);
            existingGroups.forEach(doc => batch.delete(doc.ref));

            // Add new groups
            groupsToSave.forEach((group, index) => {
                const groupRef = userRef.collection('groups').doc(`group_${index}`);
                const groupData = {
                    name: group.name,
                    archived: group.archived || false,
                    running: group.running || false,
                    logs: group.logs || []
                };

                // Handle startedAt timestamp safely
                if (group.startedAt) {
                    try {
                        // Try to use Firebase Timestamp if available
                        if (window.firebaseDb.Timestamp && window.firebaseDb.Timestamp.fromDate) {
                            groupData.startedAt = window.firebaseDb.Timestamp.fromDate(new Date(group.startedAt));
                        } else {
                            // Fallback to regular Date object
                            groupData.startedAt = new Date(group.startedAt);
                        }
                    } catch (timestampError) {
                        console.warn('Timestamp conversion failed, using Date object:', timestampError);
                        groupData.startedAt = new Date(group.startedAt);
                    }
                } else {
                    groupData.startedAt = null;
                }

                batch.set(groupRef, groupData);
            });

            await batch.commit();
            setLastSync(new Date());
            console.log('Firebase sync completed successfully');
        } catch (error) {
            console.error('Error saving to Firestore:', error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                user: user?.uid,
                firebaseAvailable: isFirebaseAvailable()
            });
            setSyncError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // Load groups from Firestore
    const loadFromFirestore = useCallback(async () => {
        if (!user || !isFirebaseAvailable()) {
            console.log('Firebase load skipped: user or Firebase not available', { user: !!user, firebase: isFirebaseAvailable() });
            return [];
        }

        try {
            console.log('Loading data from Firestore for user:', user.uid);
            setIsLoading(true);
            setSyncError(null);

            const userRef = window.firebaseDb.collection('users').doc(user.uid);
            const groupsSnapshot = await userRef.collection('groups').orderBy('name').get();

            console.log('Found groups in Firestore:', groupsSnapshot.size);
            const firestoreGroups = [];
            groupsSnapshot.forEach(doc => {
                const data = doc.data();
                let startedAt = null;

                // Handle startedAt timestamp conversion safely
                if (data.startedAt) {
                    try {
                        if (data.startedAt.toDate && typeof data.startedAt.toDate === 'function') {
                            // Firestore Timestamp object
                            startedAt = data.startedAt.toDate().getTime();
                        } else if (data.startedAt instanceof Date) {
                            // Regular Date object
                            startedAt = data.startedAt.getTime();
                        } else {
                            // Try to parse as date string
                            startedAt = new Date(data.startedAt).getTime();
                        }
                    } catch (timestampError) {
                        console.warn('Timestamp conversion failed:', timestampError);
                        startedAt = null;
                    }
                }

                firestoreGroups.push({
                    name: data.name,
                    archived: data.archived || false,
                    running: data.running || false,
                    startedAt: startedAt,
                    logs: data.logs || []
                });
            });

            setLastSync(new Date());
            console.log('Loaded groups from Firestore:', firestoreGroups.length);
            return firestoreGroups;
        } catch (error) {
            console.error('Error loading from Firestore:', error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                user: user?.uid,
                firebaseAvailable: isFirebaseAvailable()
            });
            setSyncError(error.message);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // Merge local and cloud data
    const mergeData = useCallback((localGroups, cloudGroups) => {
        if (!localGroups.length) return cloudGroups;
        if (!cloudGroups.length) return localGroups;

        // Simple merge strategy: prefer local data for conflicts
        // In a production app, you might want more sophisticated conflict resolution
        const merged = [...localGroups];

        // Add any cloud groups that don't exist locally
        cloudGroups.forEach(cloudGroup => {
            const exists = merged.some(localGroup => localGroup.name === cloudGroup.name);
            if (!exists) {
                merged.push(cloudGroup);
            }
        });

        return merged;
    }, []);

    // Handle sign-in: prioritize cloud data over local data
    const handleSignIn = useCallback(async () => {
        if (!user || !isFirebaseAvailable()) return;

        try {
            const isDemoMode = localStorage.getItem('demoMode') === 'true';
            const localGroups = JSON.parse(localStorage.getItem('groups') || '[]');
            const cloudGroups = await loadFromFirestore();

            if (cloudGroups.length > 0) {
                // Always prioritize cloud data
                console.log('Using cloud data (cloud has', cloudGroups.length, 'groups)');
                setGroups(cloudGroups);
            } else if (localGroups.length > 0 && !isDemoMode) {
                // Upload local data to cloud if no cloud data exists and not in demo mode
                console.log('Uploading local data to cloud (local has', localGroups.length, 'groups)');
                await saveToFirestore(localGroups);
            } else if (isDemoMode) {
                console.log('Demo mode active - not uploading demo data to cloud');
            }
        } catch (error) {
            console.error('Error during sign-in sync:', error);
            setSyncError(error.message);
        }
    }, [user, setGroups, loadFromFirestore, saveToFirestore]);

    // Auto-save when groups change (if authenticated and not in demo mode)
    useEffect(() => {
        const isDemoMode = localStorage.getItem('demoMode') === 'true';
        if (user && groups.length > 0 && !isDemoMode) {
            const timeoutId = setTimeout(() => {
                saveToFirestore(groups);
            }, 1000); // Debounce saves

            return () => clearTimeout(timeoutId);
        }
    }, [groups, user, saveToFirestore]);

    // Handle sign-in when user changes
    useEffect(() => {
        if (user) {
            handleSignIn();
        }
    }, [user, handleSignIn]);

    // Function to manually import JSON data and override cloud data
    const importAndSyncData = useCallback(async (importedGroups) => {
        if (!user || !isFirebaseAvailable()) {
            console.error('Cannot sync: user not authenticated or Firebase not available');
            alert('Cannot sync: Firebase not available. Please check your connection.');
            return false;
        }

        const isDemoMode = localStorage.getItem('demoMode') === 'true';
        if (isDemoMode) {
            console.log('Demo mode active - not syncing imported data to cloud');
            alert('Demo mode active - data imported locally only (not synced to cloud)');
            return true;
        }

        try {
            console.log('Importing and syncing data to cloud:', importedGroups.length, 'groups');
            setIsLoading(true);
            setSyncError(null);

            await saveToFirestore(importedGroups);
            console.log('Data successfully imported and synced to cloud');
            alert(`Successfully imported ${importedGroups.length} groups and synced to cloud!`);
            return true;
        } catch (error) {
            console.error('Error importing and syncing data:', error);
            setSyncError(error.message);
            alert(`Error syncing to cloud: ${error.message}`);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [user, saveToFirestore]);

    // Function to clear cloud data and local data
    const clearCloudData = useCallback(async () => {
        if (!user || !isFirebaseAvailable()) {
            console.error('Cannot clear cloud data: user not authenticated or Firebase not available');
            return false;
        }

        try {
            console.log('Clearing cloud data...');
            const userRef = window.firebaseDb.collection('users').doc(user.uid);
            const existingGroups = await userRef.collection('groups').get();

            const batch = window.firebaseDb.batch();
            existingGroups.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            // Also clear local data to prevent re-sync
            console.log('Clearing local data...');
            localStorage.removeItem('groups');
            setGroups([]);

            console.log('Cloud and local data cleared successfully');
            return true;
        } catch (error) {
            console.error('Error clearing cloud data:', error);
            setSyncError(error.message);
            return false;
        }
    }, [user, setGroups]);

    return {
        isLoading,
        lastSync,
        syncError,
        saveToFirestore,
        loadFromFirestore,
        isFirebaseAvailable: isFirebaseAvailable(),
        importAndSyncData,
        clearCloudData
    };
}
