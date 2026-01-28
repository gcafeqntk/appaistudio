import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    User as FirebaseUser
} from "firebase/auth";
import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { User, UserRole } from "../types";

export const authService = {
    // Register new user
    registerUser: async (email: string, password: string, username: string, phone: string, role: UserRole = 'user'): Promise<User> => {
        try {
            // 1. Create User in Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // 2. Update Display Name
            await updateProfile(firebaseUser, {
                displayName: username
            });

            // 3. Create User Profile in Firestore
            const newUser: User = {
                id: firebaseUser.uid,
                username: username,
                email: email,
                phone: phone,
                role: role,
                allowedApps: [], // Default locked
                createdAt: Date.now()
            };

            // Auto-promote specific user (Legacy logic)
            if (username === 'huytamky') {
                newUser.role = 'admin';
                newUser.allowedApps = ['video-viral', 'image-script', 'zenshot-ai', 'translation', 'new-tool'];
            }

            await setDoc(doc(db, "users", firebaseUser.uid), newUser);

            return newUser;
        } catch (error) {
            throw error;
        }
    },

    // Login user
    loginUser: async (email: string, password: string): Promise<User> => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // Fetch extra profile data from Firestore
            const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

            if (userDoc.exists()) {
                return userDoc.data() as User;
            } else {
                // Fallback for users created directly in Firebase Console without Firestore profile
                return {
                    id: firebaseUser.uid,
                    username: firebaseUser.displayName || email.split('@')[0],
                    email: email,
                    role: 'user',
                    createdAt: Date.now()
                };
            }
        } catch (error) {
            throw error;
        }
    },

    // Get current user profile
    getUserProfile: async (uid: string): Promise<User | null> => {
        try {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
                return userDoc.data() as User;
            }
            return null;
        } catch (error) {
            console.error("Error fetching user profile:", error);
            return null;
        }
    },

    // Logout
    logoutUser: async () => {
        return signOut(auth);
    },

    // Password Reset
    resetPassword: async (email: string) => {
        return sendPasswordResetEmail(auth, email);
    }
};
