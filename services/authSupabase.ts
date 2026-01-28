
import { supabase } from './supabase';
import { User, UserRole } from '../types';

export const authSupabase = {
    // Register new user
    registerUser: async (email: string, password: string, username: string, phone: string, role: UserRole = 'user'): Promise<User> => {
        try {
            // 1. Sign up with Supabase Auth
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username,
                        phone
                    }
                }
            });

            if (error) throw error;
            if (!data.user) throw new Error('Registration failed');

            // 2. Determine initial role and apps (Legacy logic for 'huytamky')
            let initialRole = role;
            let initialAllowedApps: string[] = [];

            if (username === 'huytamky') {
                initialRole = 'admin';
                initialAllowedApps = ['video-viral', 'image-script', 'zenshot-ai', 'translation', 'new-tool'];
            }

            // 3. Create Profile in public.users table
            const newUser: User = {
                id: data.user.id,
                username: username,
                email: email,
                phone: phone,
                role: initialRole,
                allowedApps: initialAllowedApps,
                createdAt: Date.now()
            };

            // 3. Create Profile (Best Effort - Don't block registration if this fails)
            // Trigger or Self-healing on Login will back this up.
            try {
                const { error: dbError } = await supabase
                    .from('users')
                    .insert({
                        id: newUser.id,
                        username: newUser.username,
                        email: newUser.email,
                        phone: newUser.phone,
                        role: newUser.role,
                        allowed_apps: newUser.allowedApps,
                        created_at: new Date().toISOString()
                    });

                if (dbError) {
                    // Ignore "AbortError" or "Duplicate key" - likely Trigger handled it
                    console.warn("⚠️ Best-effort profile creation skipped:", dbError.message);
                } else {
                    console.log("✅ User created successfully in DB");
                }
            } catch (err) {
                console.warn("⚠️ Profile insert network error (Ignored):", err);
            }

            // Return user regardless of DB result
            return newUser;

            console.log("✅ User created successfully in both Auth and DB");
            return newUser;
        } catch (error: any) {
            throw error;
        }
    },

    // Login user
    loginUser: async (email: string, password: string): Promise<User> => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            if (!data.user) throw new Error('Login failed');

            // Fetch profile with RESCUE MODE + 4s Timeout
            try {
                // Strict 4s limit for DB fetch. If Supabase is slow, skip it.
                const profilePromise = authSupabase.getUserProfile(data.user.id);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("DB Fetch Timeout")), 4000)
                );

                const profile = await Promise.race([profilePromise, timeoutPromise]) as User | null;
                if (profile) return profile;
            } catch (err) {
                console.error("⚠️ Profile fetch slow/failed, entering RESCUE MODE:", err);
            }

            // Rescue / Fallback: Profile missing or DB Error. 
            // Return Safe User so they can at least login.
            console.log("⚠️ Entering Rescue Mode for User");

            const username = data.user.user_metadata?.username || email.split('@')[0];
            const phone = data.user.user_metadata?.phone || '';

            // Legacy Admin Logic
            let role: UserRole = 'user';
            let allowedApps: string[] = [];
            if (username === 'huytamky' || email.includes('huytamky')) {
                role = 'admin';
                allowedApps = ['video-viral', 'image-script', 'zenshot-ai', 'translation', 'new-tool'];
            }

            const newUser: User = {
                id: data.user.id,
                username: username,
                email: email,
                phone: phone,
                role: role,
                allowedApps: allowedApps,
                createdAt: Date.now()
            };

            // Try to auto-fix DB (Best Effort)
            // Fire and forget - don't await/block
            supabase.from('users').insert({
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                phone: newUser.phone,
                role: newUser.role,
                allowed_apps: newUser.allowedApps,
                created_at: new Date().toISOString()
            }).then(({ error }) => {
                if (error) console.warn("Rescue auto-heal failed:", error.message);
            });

            return newUser;
        } catch (error) {
            throw error;
        }
    },

    // Get current user profile
    getUserProfile: async (uid: string): Promise<User | null> => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', uid)
                .single();

            if (error) return null;

            // Map Snake_case DB to CamelCase Type
            return {
                id: data.id,
                username: data.username,
                email: data.email,
                phone: data.phone,
                role: data.role as UserRole,
                allowedApps: data.allowed_apps || [],
                createdAt: new Date(data.created_at).getTime()
            };
        } catch (error) {
            console.error("Error fetching user profile:", error);
            return null;
        }
    },

    // Logout
    logoutUser: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    // Update Profile
    updateProfile: async (uid: string, updates: Partial<User>) => {
        // Map updates to DB columns
        const dbUpdates: any = {};
        if (updates.username) dbUpdates.username = updates.username;
        if (updates.phone) dbUpdates.phone = updates.phone;
        if (updates.email) dbUpdates.email = updates.email; // Note: Changing email in Auth is separate step usually
        if (updates.role) dbUpdates.role = updates.role;
        if (updates.allowedApps) dbUpdates.allowed_apps = updates.allowedApps;

        const { error } = await supabase
            .from('users')
            .update(dbUpdates)
            .eq('id', uid);

        if (error) throw error;
    }
};
