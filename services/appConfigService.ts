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
    }
};
