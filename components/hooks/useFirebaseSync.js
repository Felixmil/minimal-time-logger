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
        if (!user || !isFirebaseAvailable()) return;

        try {
            setIsLoading(true);
            setSyncError(null);

            const batch = window.firebaseDb.batch();
            const userRef = window.firebaseDb.collection('users').doc(user.uid);

            // Clear existing groups
            const existingGroups = await userRef.collection('groups').get();
            existingGroups.forEach(doc => batch.delete(doc.ref));

            // Add new groups
            groupsToSave.forEach((group, index) => {
                const groupRef = userRef.collection('groups').doc(`group_${index}`);
                batch.set(groupRef, {
                    name: group.name,
                    archived: group.archived || false,
                    running: group.running || false,
                    startedAt: group.startedAt ? window.firebaseDb.Timestamp.fromDate(new Date(group.startedAt)) : null,
                    logs: group.logs || []
                });
            });

            await batch.commit();
            setLastSync(new Date());
        } catch (error) {
            console.error('Error saving to Firestore:', error);
            setSyncError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // Load groups from Firestore
    const loadFromFirestore = useCallback(async () => {
        if (!user || !isFirebaseAvailable()) return [];

        try {
            setIsLoading(true);
            setSyncError(null);

            const userRef = window.firebaseDb.collection('users').doc(user.uid);
            const groupsSnapshot = await userRef.collection('groups').orderBy('name').get();

            const firestoreGroups = [];
            groupsSnapshot.forEach(doc => {
                const data = doc.data();
                firestoreGroups.push({
                    name: data.name,
                    archived: data.archived || false,
                    running: data.running || false,
                    startedAt: data.startedAt ? data.startedAt.toDate().getTime() : null,
                    logs: data.logs || []
                });
            });

            setLastSync(new Date());
            return firestoreGroups;
        } catch (error) {
            console.error('Error loading from Firestore:', error);
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

    // Handle sign-in: merge local and cloud data
    const handleSignIn = useCallback(async () => {
        if (!user || !isFirebaseAvailable()) return;

        try {
            const localGroups = JSON.parse(localStorage.getItem('groups') || '[]');
            const cloudGroups = await loadFromFirestore();

            if (localGroups.length > 0 && cloudGroups.length > 0) {
                const shouldMerge = confirm(
                    'You have data both locally and in the cloud. Would you like to merge them? ' +
                    'Local data will be preserved in case of conflicts.'
                );

                if (shouldMerge) {
                    const mergedGroups = mergeData(localGroups, cloudGroups);
                    setGroups(mergedGroups);
                    await saveToFirestore(mergedGroups);
                } else {
                    // Use cloud data
                    setGroups(cloudGroups);
                }
            } else if (cloudGroups.length > 0) {
                // Use cloud data
                setGroups(cloudGroups);
            } else if (localGroups.length > 0) {
                // Upload local data
                await saveToFirestore(localGroups);
            }
        } catch (error) {
            console.error('Error during sign-in sync:', error);
            setSyncError(error.message);
        }
    }, [user, setGroups, loadFromFirestore, saveToFirestore, mergeData]);

    // Auto-save when groups change (if authenticated)
    useEffect(() => {
        if (user && groups.length > 0) {
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

    return {
        isLoading,
        lastSync,
        syncError,
        saveToFirestore,
        loadFromFirestore,
        isFirebaseAvailable: isFirebaseAvailable()
    };
}
