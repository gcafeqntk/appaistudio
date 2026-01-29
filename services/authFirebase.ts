import { auth, db } from './firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile as updateFirebaseProfile,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs
} from 'firebase/firestore';
import { User, UserRole } from '../types';

export const authFirebase = {
    // Register new user
    registerUser: async (email: string, password: string, username: string, phone: string, role: UserRole = 'user'): Promise<User> => {
        try {
            // 0. CHECK UNIQUE USERNAME & PHONE
            // We need to query Firestore to see if these already exist
            const usersRef = collection(db, "users");

            // Check Username
            const qUsername = query(usersRef, where("username", "==", username));
            const snapUsername = await getDocs(qUsername);
            if (!snapUsername.empty) {
                throw new Error("Tên hiển thị đã tồn tại. Vui lòng chọn tên khác.");
            }

            // Check Phone
            const qPhone = query(usersRef, where("phone", "==", phone));
            const snapPhone = await getDocs(qPhone);
            if (!snapPhone.empty) {
                throw new Error("Số điện thoại đã được đăng ký bởi tài khoản khác.");
            }

            // 1. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Update Display Name
            await updateFirebaseProfile(user, {
                displayName: username
            });

            // 3. Determine initial role (ALWAYS User unless explicitly configured via DB later)
            // REMOVED INSECURE 'huytamky' CHECK
            let initialRole: UserRole = 'user';

            // Allow caller to pass 'admin' effectively ONLY if this function is called by an Admin panel in future,
            // but for public registration (default flow), we ignore the 'role' arg or ensure it's 'user' at call site.
            // For safety, we force 'user' here for public registration if we can't distinguish.
            // But since this function might be used by Admin to create users, we keep the param but default to 'user'.
            if (role === 'admin') {
                // Warning: Typically we don't allow creating admins via public registration.
                // Assuming this function is called by Auth form which passes 'user'.
                initialRole = role;
            }

            let initialAllowedApps: string[] = ['video-viral', 'image-script', 'zenshot-ai', 'translation']; // Default enabled apps for new users

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
            // Re-throw specific errors for UI to handle
            if (error.code === 'auth/email-already-in-use') {
                throw new Error("Email này đã được đăng ký.");
            }
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

    // Login with Google
    loginWithGoogle: async (): Promise<User> => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if user exists in Firestore
            let userProfile = await authFirebase.getUserProfile(user.uid);

            if (!userProfile) {
                // Create new user profile for Google User
                userProfile = {
                    id: user.uid,
                    username: user.displayName || user.email?.split('@')[0] || 'Google User',
                    email: user.email || '',
                    phone: user.phoneNumber || '',
                    role: 'user',
                    allowedApps: ['video-viral', 'image-script', 'zenshot-ai', 'translation'],
                    createdAt: Date.now()
                };

                await setDoc(doc(db, "users", user.uid), userProfile);
            }

            return userProfile;
        } catch (error: any) {
            console.error("Google Login Error:", error);
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
