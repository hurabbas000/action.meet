// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBInxnda18rzrTEzYdo0PL2Q0-ThmrsXrI",
    authDomain: "actionmeet-63273.firebaseapp.com",
    projectId: "actionmeet-63273",
    storageBucket: "actionmeet-63273.appspot.com",
    messagingSenderId: "511256922245",
    appId: "1:511256922245:web:1d5ac7f5439c2bb43f81ec",
    measurementId: "G-ML5H1CXNE0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence (optional)
db.enablePersistence()
    .then(() => {
        console.log("Firestore offline persistence enabled");
    })
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
        } else if (err.code == 'unimplemented') {
            console.log("The current browser does not support persistence.");
        }
    });

// Export Firebase services for use in other files
window.firebase = firebase;
window.auth = auth;
window.db = db;
