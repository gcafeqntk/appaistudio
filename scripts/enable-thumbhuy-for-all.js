// Script to enable thumbhuy app for all existing users
// Run this once to migrate existing users

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Firebase config (same as your app)
const firebaseConfig = {
    apiKey: "AIzaSyBFvqnj3tI8Gxsw2a3RA0O2-9yUOxpN-Rg",
    authDomain: "aistudio-90ca1.firebaseapp.com",
    projectId: "aistudio-90ca1",
    storageBucket: "aistudio-90ca1.firebasestorage.app",
    messagingSenderId: "103692595906",
    appId: "1:103692595906:web:64e5d4ad15cf39c77a3a49"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function enableThumbhuyForAll() {
    console.log('🔄 Starting migration: Enable thumbhuy for all users...\n');

    try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);

        let updated = 0;
        let skipped = 0;

        for (const userDoc of snapshot.docs) {
            const userData = userDoc.data();
            const currentApps = userData.allowedApps || [];

            // Check if thumbhuy already enabled
            if (currentApps.includes('thumbhuy')) {
                console.log(`⏭️  Skipped: ${userData.username} (already has thumbhuy)`);
                skipped++;
                continue;
            }

            // Add thumbhuy to allowedApps
            const newApps = [...currentApps, 'thumbhuy'];
            await updateDoc(doc(db, 'users', userDoc.id), {
                allowedApps: newApps
            });

            console.log(`✅ Updated: ${userData.username} - Added thumbhuy`);
            updated++;
        }

        console.log(`\n📊 Migration Complete!`);
        console.log(`   ✅ Updated: ${updated} users`);
        console.log(`   ⏭️  Skipped: ${skipped} users`);
        console.log(`\n🎉 All users now have access to Thumbnail Master!`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

enableThumbhuyForAll();
