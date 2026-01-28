import { supabase } from "./supabase";
// import { AppConfig } from "../types"; // Types might need adjustment if using DB

export const appConfigService = {
    // Fetch app names from Supabase (assuming 'app_config' table exists, or return defaults)
    async getAppNames(): Promise<Record<string, string>> {
        try {
            // For now, to break Firebase dependency, we return defaults or empty.
            // If you want to store config in Supabase, create a table 'app_config' (id, key, value)
            const { data, error } = await supabase
                .from('app_config')
                .select('*')
                .eq('id', 'global_names')
                .single();

            if (data && data.names) {
                return data.names;
            }
            return {};
        } catch (error) {
            console.warn("App Config Fetch Error (Ignorable if table missing):", error);
            return {};
        }
    },

    // Save all app names
    async saveAppConfig(newNames: Record<string, string>): Promise<void> {
        try {
            // Upsert
            await supabase
                .from('app_config')
                .upsert({ id: 'global_names', names: newNames });
        } catch (error) {
            console.error("Error saving app config:", error);
            throw error;
        }
    }
};
