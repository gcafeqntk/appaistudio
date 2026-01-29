import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const appConfigService = {
    // Fetch app names from Firestore 'system_config/app_names'
    async getAppNames(): Promise<Record<string, string>> {
        try {
            const docRef = doc(db, "system_config", "app_names");
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data().names || {};
            }
            return {};
        } catch (error) {
            console.warn("App Config Fetch Error:", error);
            return {};
        }
    },

    // Save all app names to Firestore
    async saveAppConfig(newNames: Record<string, string>): Promise<void> {
        try {
            const docRef = doc(db, "system_config", "app_names");
            await setDoc(docRef, { names: newNames }, { merge: true });
        } catch (error) {
            console.error("Error saving app config:", error);
            throw error;
        }
    },

    // --- LANDING PAGE SETTINGS ---

    // Get Landing Page Settings
    async getLandingPageSettings(): Promise<any | null> {
        try {
            const docRef = doc(db, "system_config", "landing_page");
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data().settings;
            }
            return null;
        } catch (error) {
            console.warn("Landing Page Config Fetch Error:", error);
            return null;
        }
    },

    // Save Landing Page Settings
    async saveLandingPageSettings(settings: any): Promise<void> {
        try {
            const docRef = doc(db, "system_config", "landing_page");
            await setDoc(docRef, { settings: settings }, { merge: true });
        } catch (error) {
            console.error("Error saving landing page config:", error);
            throw error;
        }
    }
};
