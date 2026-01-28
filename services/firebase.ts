// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAGphhC3qC1qLA_ErvpWk9QAaHc0N3ovQM",
    authDomain: "appaistudio-55b77.firebaseapp.com",
    projectId: "appaistudio-55b77",
    storageBucket: "appaistudio-55b77.firebasestorage.app",
    messagingSenderId: "98616437820",
    appId: "1:98616437820:web:10b78e2f4718d35b3ee739",
    measurementId: "G-Q8Q00T026N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, auth, db, storage };
