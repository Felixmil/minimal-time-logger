// Firebase Configuration
// This file is safe to commit to public repositories
// Firebase API keys are public and designed to be exposed

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCC8oeIo_6yjhI2I1tDdR7LIs0XGdbBx9g",
    authDomain: "felix-minimal-time-logger.firebaseapp.com",
    projectId: "felix-minimal-time-logger",
    storageBucket: "felix-minimal-time-logger.firebasestorage.app",
    messagingSenderId: "1075186883458",
    appId: "1:1075186883458:web:54ae863951b2d3921f4d9b"
};

// Initialize Firebase
let app, auth, db;

try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    console.log('Firebase initialized successfully');
} catch (error) {
    console.warn('Firebase initialization failed:', error);
    console.log('App will work with localStorage only.');
}

// Export Firebase services
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDb = db;
