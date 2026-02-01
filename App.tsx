
import React, { useState, useEffect } from 'react';
import ApiKeyManager from './components/ApiKeyManager';
import Auth from './components/Auth';
import VideoViralApp from './apps/VideoViralApp';
import ImageScriptApp from './apps/ImageScriptApp';
import ZenShotApp from './apps/ZenShotApp';
import LandingPage from './apps/LandingPage';
import TranslationApp from './apps/TranslationApp';
import NewToolApp from './apps/NewToolApp';
import ThumbHuyApp from './apps/ThumbHuyApp';
import UserProfile from './components/UserProfile';
import { User } from './types';
import { auth, db } from './services/firebase'; // NEW Firebase Import
import { onAuthStateChanged } from 'firebase/auth';
import { authFirebase } from './services/authFirebase'; // For fallback profile fetch if needed
import { appConfigService } from './services/appConfigService';

// Define access control helper
const checkAccess = (user: User | null, appKey: string): { allowed: boolean; reason?: 'guest' | 'disabled' } => {
  if (!user) return { allowed: false, reason: 'guest' };
  // Admin bypass
  if (user.role === 'admin') return { allowed: true };

  // Default allow if allowedApps is undefined (legacy support), OR check inclusion
  // BUT user requirement says: "Allowed UNLESS Admin disable". 
  // However, the previous logic was `currentUser.allowedApps?.includes`.
  // Let's assume allowedApps is "Apps allowed explicitly" or "Apps NOT disabled"?
  // Re-reading user request: "admin disable app đó".
  // Let's stick to the existing data structure: `allowedApps` contains ENABLED apps. 
  // If `allowedApps` is missing, we might assume strict default or open default.
  // Given previous DB logic `allowedApps` usually lists ENABLED apps.
  // We will assume if `allowedApps` is present, it's an allow-list. 
  // If we want "block list", we'd need a different field. 
  // User said: "trừ trường hợp Admin disable app". 
  // So likely the logic should be: Is it in the Allowed List?

  if (user.allowedApps && user.allowedApps.includes(appKey)) return { allowed: true };

  return { allowed: false, reason: 'disabled' };
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'video-viral' | 'image-script' | 'zenshot-ai' | 'translation' | 'new-tool' | 'thumbhuy'>('home');
  const [showProfile, setShowProfile] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [appNames, setAppNames] = useState<Record<string, string>>({});
  const [showAuthModal, setShowAuthModal] = useState(false); // For Guest trying to access apps

  const fetchAppNames = async () => {
    const names = await appConfigService.getAppNames();
    setAppNames(names);
  };

  useEffect(() => {
    fetchAppNames();
  }, []);

  // Listen to FIREBASE Auth state (Replaces Supabase Auth)
  useEffect(() => {
    // onAuthStateChanged returns an unsubscribe function
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // 1. Fetch Profile from Firestore
          const profile = await authFirebase.getUserProfile(firebaseUser.uid);

          if (profile) {
            setCurrentUser(profile);
          } else {
            // Fallback for new users or missing profiles
            setCurrentUser({
              id: firebaseUser.uid,
              username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              role: 'user',
              allowedApps: ['video-viral', 'image-script', 'zenshot-ai', 'translation', 'thumbhuy'], // Default allowed apps for new users
              createdAt: Date.now()
            });
          }
          setShowAuthModal(false); // Close auth modal on successful login
        } else {
          // User is signed out
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("Firebase Auth State Error:", err);
        setCurrentUser(null);
      } finally {
        setInitializing(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setShowAuthModal(false);
  };

  const handleLogout = async () => {
    // setInitializing(true); // Don't full spinner on logout, just reset state
    await authFirebase.logoutUser();
    setActiveTab('home'); // Redirect to home on logout
  };

  const handleNavigate = (tab: typeof activeTab) => {
    if (tab === 'home') {
      setActiveTab('home');
      return;
    }

    // CHECK API KEYS (New Requirement)
    if (currentUser) {
      const keyStorage = localStorage.getItem(`app_api_keys_${currentUser.id}`);
      let hasGeminiKeys = false;
      if (keyStorage) {
        try {
          const parsed = JSON.parse(keyStorage);
          // Simple decode similar to ApiKeyManager
          const decode = (str: string) => { try { return atob(str); } catch (e) { return str; } };
          const geminiStr = decode(parsed.gemini || '');
          if (geminiStr && geminiStr.trim().length > 0) {
            hasGeminiKeys = true;
          }
        } catch (e) {
          console.error("Error checking keys", e);
        }
      }

      if (!hasGeminiKeys) {
        alert("Hãy nhập nhiều API key Gemini vào để sử dụng");
        return;
      }
    }

    const { allowed, reason } = checkAccess(currentUser, tab);

    if (allowed) {
      setActiveTab(tab);
    } else {
      if (reason === 'guest') {
        alert("App này chỉ dành cho thành viên, hãy đăng ký.");
        setShowAuthModal(true);
      } else if (reason === 'disabled') {
        alert("Bạn chưa được cấp quyền truy cập ứng dụng này. Vui lòng liên hệ Admin.");
      }
    }
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="text-slate-400 text-xs animate-pulse">Loading App Engine...</p>
      </div>
    );
  }

  // --- RENDER ---

  // Auth Modal for Guests
  if (showAuthModal && !currentUser) {
    // We wrap Auth component in a primitive modal or just render it fullscreen but with a "Cancel" option?
    // Given existing Auth component structure, probably simpler to check if we can add a 'back' button or overlay.
    // For now, let's render Auth as a fullscreen overlay that sits on top of Landing Page (or replaces it temporarily).
    // Or better: Just render Auth, but pass a prop to show 'Close' button?
    // The existing Auth component (viewed previously) seems to be a full page. 
    // Let's modify logic: If showAuthModal, render Auth. If user cancels, go back.
    // But Auth doesn't have 'Cancel'. Just 'Switch Mode'. 
    // We will assume Auth is the only view. We can add a "Back to Home" button inside Auth if we modified it, 
    // or just render a wrapper here.
    return (
      <div className="relative z-50">
        <button
          onClick={() => setShowAuthModal(false)}
          className="fixed top-4 right-4 z-[60] text-white bg-slate-800/50 hover:bg-slate-700 p-2 rounded-full"
        >
          ✕ Close
        </button>
        <Auth onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center relative">
      {/* 1. API Key Manager (Only for Members) */}
      {currentUser && <ApiKeyManager userId={currentUser.id} />}

      {/* 2. Navigation Bar (Shell Header) */}
      <nav className="w-full bg-[#020617] text-white border-b border-white/5 sticky top-0 z-[100] px-6 md:px-12 py-4 backdrop-blur-2xl bg-opacity-95 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">

        {/* Logo & Branding */}
        <div className="flex items-center gap-6 cursor-pointer" onClick={() => handleNavigate('home')}>
          <div className="bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 p-3 rounded-2xl shadow-2xl shadow-indigo-500/30 ring-4 ring-indigo-500/10">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">
              QUANG HUY <span className="text-indigo-400">STUDIO</span>
            </h1>
            <span className="text-[10px] font-black text-indigo-400/70 uppercase tracking-[0.4em] mt-1">Multi-App Engine</span>
          </div>
        </div>

        {/* TAB MENU (CENTER) */}
        <div className="flex items-center bg-white/5 rounded-2xl p-1 border border-white/10 overflow-x-auto max-w-full">
          {/* We render ALL tabs, but handle click with checkAccess */}
          {[
            { id: 'video-viral', defaultName: 'Video Viral Engine' },
            { id: 'image-script', defaultName: 'Visual Script Engine' },
            { id: 'zenshot-ai', defaultName: 'ZenShot AI (New)' },
            { id: 'translation', defaultName: 'Translation AI' },
            { id: 'thumbhuy', defaultName: 'Thumbnail Master' },
            { id: 'new-tool', defaultName: 'New Application' }
          ].map(app => (
            <button
              key={app.id}
              onClick={() => handleNavigate(app.id as any)}
              className={`px-4 md:px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === app.id
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              {appNames[app.id] || app.defaultName}
            </button>
          ))}
        </div>

        {/* User Info & Logout/Login */}
        <div className="flex items-center gap-6">
          {currentUser ? (
            <>
              <div className="text-right hidden md:block">
                <div className="text-xs font-black uppercase text-indigo-400">Hello, {currentUser.username}</div>
                <button onClick={handleLogout} className="text-[10px] uppercase font-bold text-slate-500 hover:text-white transition-colors">Logout</button>
              </div>
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center font-black text-sm shadow-lg ring-2 ring-indigo-400/20 cursor-pointer hover:ring-indigo-400 hover:scale-105 transition-all" onClick={() => setShowProfile(true)}>
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
            </>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
            >
              Đăng Nhập
            </button>
          )}
        </div>
      </nav>

      {/* 3. Content Area */}
      <div className="w-full h-[calc(100vh-140px)]">
        {activeTab === 'home' && (
          <LandingPage
            key={currentUser?.id || 'guest'}
            user={currentUser || { id: 'guest', username: 'Guest', role: 'user', createdAt: 0 }}
            onNavigate={handleNavigate}
          />
        )}

        {/* Only render Apps if User is logged in AND allowed (Safety double check) */}
        {currentUser && checkAccess(currentUser, 'video-viral').allowed && activeTab === 'video-viral' && <VideoViralApp key={currentUser.id} userId={currentUser.id} />}
        {currentUser && checkAccess(currentUser, 'image-script').allowed && activeTab === 'image-script' && <ImageScriptApp key={currentUser.id} userId={currentUser.id} />}
        {currentUser && checkAccess(currentUser, 'zenshot-ai').allowed && activeTab === 'zenshot-ai' && <ZenShotApp key={currentUser.id} userId={currentUser.id} />}
        {currentUser && checkAccess(currentUser, 'translation').allowed && activeTab === 'translation' && <TranslationApp key={currentUser.id} userId={currentUser.id} />}
        {currentUser && checkAccess(currentUser, 'thumbhuy').allowed && activeTab === 'thumbhuy' && <ThumbHuyApp key={currentUser.id} userId={currentUser.id} />}
        {currentUser && checkAccess(currentUser, 'new-tool').allowed && activeTab === 'new-tool' && <NewToolApp key={currentUser.id} />}
      </div>

      {showProfile && currentUser && (
        <UserProfile
          user={currentUser}
          onUpdateUser={handleUpdateUser}
          onClose={() => setShowProfile(false)}
          appNames={appNames}
          onUpdateAppNames={fetchAppNames}
        />
      )}
    </div>
  );
};

export default App;
