
import React, { useState, useEffect } from 'react';
import ApiKeyManager from './components/ApiKeyManager';
import Auth from './components/Auth';
import VideoViralApp from './apps/VideoViralApp';
import ImageScriptApp from './apps/ImageScriptApp';
import ZenShotApp from './apps/ZenShotApp';
import LandingPage from './apps/LandingPage';
import TranslationApp from './apps/TranslationApp';

import NewToolApp from './apps/NewToolApp';



import UserProfile from './components/UserProfile';
import { User } from './types';

import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import { authService } from './services/authService';
import { appConfigService } from './services/appConfigService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'video-viral' | 'image-script' | 'zenshot-ai' | 'translation' | 'new-tool'>('home');
  const [showProfile, setShowProfile] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [appNames, setAppNames] = useState<Record<string, string>>({});

  const fetchAppNames = async () => {
    const names = await appConfigService.getAppNames();
    setAppNames(names);
  };

  useEffect(() => {
    fetchAppNames();
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, fetch profile from Firestore
        const profile = await authService.getUserProfile(user.uid);
        if (profile) {
          setCurrentUser(profile);
        } else {
          // Fallback if profile missing (rare sync issue)
          const fallbackUser: User = {
            id: user.uid,
            username: user.displayName || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            role: 'user',
            createdAt: Date.now()
          };
          setCurrentUser(fallbackUser);
        }
      } else {
        // User is signed out
        setCurrentUser(null);
      }
      setInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // No need to set localStorage, Firebase handles session
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    // In real app, we should also update Firestore here if needed, 
    // but UserProfile component likely calls an update service. 
    // For now we just update local state to reflect changes immediately.
  };

  const handleLogout = async () => {
    setInitializing(true);
    await authService.logoutUser();
    // State update will be handled by onAuthStateChanged
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      {/* 1. API Key Manager (Global) */}
      <ApiKeyManager userId={currentUser.id} />

      {/* 2. Navigation Bar (Shell Header) */}
      <nav className="w-full bg-[#020617] text-white border-b border-white/5 sticky top-0 z-[100] px-6 md:px-12 py-4 backdrop-blur-2xl bg-opacity-95 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">

        {/* Logo & Branding */}
        <div className="flex items-center gap-6 cursor-pointer" onClick={() => setActiveTab('home')}>
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
        <div className="flex items-center bg-white/5 rounded-2xl p-1 border border-white/10">
          {(currentUser.role === 'admin' || currentUser.allowedApps?.includes('video-viral')) && (
            <button
              onClick={() => setActiveTab('video-viral')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'video-viral'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              {appNames['video-viral'] || 'Video Viral Engine'}
            </button>
          )}

          {(currentUser.role === 'admin' || currentUser.allowedApps?.includes('image-script')) && (
            <button
              onClick={() => setActiveTab('image-script')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'image-script'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              {appNames['image-script'] || 'Visual Script Engine'}
            </button>
          )}

          {(currentUser.role === 'admin' || currentUser.allowedApps?.includes('zenshot-ai')) && (
            <button
              onClick={() => setActiveTab('zenshot-ai')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'zenshot-ai'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              {appNames['zenshot-ai'] || 'ZenShot AI (New)'}
            </button>
          )}

          {(currentUser.role === 'admin' || currentUser.allowedApps?.includes('translation')) && (
            <button
              onClick={() => setActiveTab('translation')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'translation'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              {appNames['translation'] || 'Translation AI'}
            </button>
          )}





          {(currentUser.role === 'admin' || currentUser.allowedApps?.includes('new-tool')) && (
            <button
              onClick={() => setActiveTab('new-tool')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'new-tool'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              {appNames['new-tool'] || 'New Application'}
            </button>
          )}
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-6">
          <div className="text-right hidden md:block">
            <div className="text-xs font-black uppercase text-indigo-400">Hello, {currentUser.username}</div>
            <button onClick={handleLogout} className="text-[10px] uppercase font-bold text-slate-500 hover:text-white transition-colors">Logout</button>
          </div>
          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center font-black text-sm shadow-lg ring-2 ring-indigo-400/20 cursor-pointer hover:ring-indigo-400 hover:scale-105 transition-all" onClick={() => setShowProfile(true)}>
            {currentUser.username.charAt(0).toUpperCase()}
          </div>
        </div>
      </nav>

      {/* 3. Content Area */}
      <div className="w-full h-[calc(100vh-140px)]">
        {activeTab === 'home' && <LandingPage key={currentUser.id} user={currentUser} onNavigate={setActiveTab} />}
        {activeTab === 'video-viral' && <VideoViralApp key={currentUser.id} userId={currentUser.id} />}
        {activeTab === 'image-script' && <ImageScriptApp key={currentUser.id} userId={currentUser.id} />}
        {activeTab === 'zenshot-ai' && <ZenShotApp key={currentUser.id} userId={currentUser.id} />}
        {activeTab === 'translation' && <TranslationApp key={currentUser.id} userId={currentUser.id} />}

        {activeTab === 'new-tool' && <NewToolApp key={currentUser.id} />}
      </div>

      {showProfile && (
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
