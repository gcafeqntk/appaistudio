import { auth, db } from './firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import {
    doc,
    setDoc,
    getDoc,
    updateDoc
} from 'firebase/firestore';
import { User, UserRole } from '../types';

export const authFirebase = {
    // Register new user
    registerUser: async (email: string, password: string, username: string, phone: string, role: UserRole = 'user'): Promise<User> => {
        try {
            // 1. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Update Display Name
            await updateFirebaseProfile(user, {
                displayName: username
            });

            // 3. Determine initial role (admin for huytamky)
            let initialRole = role;
            let initialAllowedApps: string[] = [];

            if (username === 'huytamky' || email.includes('huytamky' || 'admin')) {
                initialRole = 'admin';
                initialAllowedApps = ['video-viral', 'image-script', 'zenshot-ai', 'translation', 'new-tool'];
            }

            // 4. Create User Profile in Firestore
            const newUser: User = {
                id: user.uid,
                username: username,
                email: email,
                phone: phone,
                role: initialRole,
                allowedApps: initialAllowedApps,
                createdAt: Date.now()
            };

            await setDoc(doc(db, "users", user.uid), newUser);

            return newUser;
        } catch (error: any) {
            console.error("Firebase Registration Error:", error);
            throw error;
        }
    },

    // Login user
    loginUser: async (email: string, password: string): Promise<User> => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Fetch profile
            const userProfile = await authFirebase.getUserProfile(user.uid);

            if (userProfile) {
                return userProfile;
            }

            // Fallback if profile missing in Firestore (Legacy/Rescue)
            const fallbackUser: User = {
                id: user.uid,
                username: user.displayName || email.split('@')[0],
                email: email,
                phone: '',
                role: 'user',
                allowedApps: [],
                createdAt: Date.now()
            };
            return fallbackUser;

        } catch (error: any) {
            console.error("Firebase Login Error:", error);
            throw error;
        }
    },

    // Get current user profile
    getUserProfile: async (uid: string): Promise<User | null> => {
        try {
            const docRef = doc(db, "users", uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data() as User;
            } else {
                console.warn("No such document!");
                return null;
            }
        } catch (error) {
            console.error("Error getting user profile:", error);
            return null;
        }
    },

    // Logout
    logoutUser: async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout Error:", error);
            throw error;
        }
    },

    // Update Profile
    updateProfile: async (uid: string, updates: Partial<User>) => {
        try {
            const userRef = doc(db, "users", uid);
            await updateDoc(userRef, updates);
        } catch (error) {
            console.error("Update Profile Error:", error);
            throw error;
        }
    }
};
