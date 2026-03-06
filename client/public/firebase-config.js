// Firebase Configuration for ActionMeet - Railway Ready
const firebaseConfig = {
    apiKey: "AIzaSyBInxnda18rzrTEzYdo0PL2Q0-ThmrsXrI",
    authDomain: "actionmeet-63273.firebaseapp.com",
    projectId: "actionmeet-63273",
    storageBucket: "actionmeet-63273.appspot.com",
    messagingSenderId: "511256922245",
    appId: "1:511256922245:web:1d5ac7f5439c2bb43f81ec"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence()
    .then(() => {
        console.log("✅ Firestore offline persistence enabled");
    })
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log("⚠️ Multiple tabs open, persistence can only be enabled in one tab at a time.");
        } else if (err.code == 'unimplemented') {
            console.log("⚠️ The current browser does not support persistence.");
        }
    });

// Test Firebase connection
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("✅ Firebase Auth: User logged in", user.email);
    } else {
        console.log("🔐 Firebase Auth: No user logged in");
    }
});

// Test Firestore connection
db.collection('_test').limit(1).get()
    .then(() => {
        console.log("✅ Firestore: Connection successful");
    })
    .catch((error) => {
        console.error("❌ Firestore: Connection failed", error);
    });

// Export for global access
window.firebase = firebase;
window.auth = auth;
window.db = db;

console.log("🚀 ActionMeet Firebase initialized successfully!");
