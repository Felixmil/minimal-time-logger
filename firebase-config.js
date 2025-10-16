// Firebase Configuration
// This file is safe to commit to public repositories

// Load configuration from GitHub Secrets (for GitHub Pages deployment)
let firebaseConfig = null;

if (typeof process !== 'undefined' && process.env && process.env.FIREBASE_API_KEY) {
    firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
    };
}

// Initialize Firebase
let app, auth, db;

if (firebaseConfig) {
    try {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
    } catch (error) {
        console.warn('Firebase initialization failed:', error);
    }
} else {
    console.log('Firebase not configured. App will work with localStorage only.');
    console.log('To enable Firebase sync, configure GitHub Secrets for deployment.');
}

// Export Firebase services
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDb = db;
