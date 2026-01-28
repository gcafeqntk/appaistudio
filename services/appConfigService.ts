import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { AppConfig } from "../types";

const CONFIG_DOC_PATH = "settings/app_config";

export const appConfigService = {
    // Fetch app names from Firestore
    async getAppNames(): Promise<Record<string, string>> {
        try {
            const docRef = doc(db, CONFIG_DOC_PATH);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as AppConfig;
                return data.appNames || {};
            } else {
                // Return empty object if no config exists yet default names will be used in UI
                return {};
            }
        } catch (error) {
            console.error("Error fetching app names:", error);
            return {};
        }
    },


    // Save all app names at once (atomic update)
    async saveAppConfig(newNames: Record<string, string>): Promise<void> {
        try {
            const docRef = doc(db, CONFIG_DOC_PATH);
            // Use setDoc with merge: true to update or create
            await setDoc(docRef, { appNames: newNames }, { merge: true });
        } catch (error) {
            console.error("Error saving app config:", error);
            throw error;
        }
    }
};
