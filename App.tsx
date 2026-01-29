
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

import { supabase } from './services/supabase';
// import { authSupabase } from './services/authSupabase'; // DEPRECATED
import { auth, db } from './services/firebase'; // NEW Firebase Import
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { authFirebase } from './services/authFirebase'; // For fallback profile fetch if needed

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
              createdAt: Date.now()
            });
          }
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

  // Old timeout removed in favor of Emergency Strategy

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
    await authFirebase.logoutUser();
    // onAuthStateChanged will handle the rest
  };

  // State for Emergency Recovery
  const [showEmergency, setShowEmergency] = useState(false);

  // Safety Timeout: Force show Emergency UI after 8 seconds if Supabase hangs
  useEffect(() => {
    const timer = setTimeout(() => {
      if (initializing) {
        console.warn("⚠️ Initialization timed out - Showing Emergency UI");
        setShowEmergency(true);
        setInitializing(false);
      }
    }, 8000); // 8 seconds absolute limit
    return () => clearTimeout(timer);
  }, [initializing]);

  const handleCreateNewProfile = async () => {
    if (!currentUser) return;
    try {
      const { error } = await supabase.from('users').insert({
        id: currentUser.id,
        username: currentUser.username,
        email: currentUser.email,
        created_at: new Date().toISOString()
      });
      if (error) alert("Error creating profile: " + error.message);
      else window.location.reload();
    } catch (e: any) {
      alert("System Error: " + e.message);
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="text-slate-400 text-xs animate-pulse">Loading App Engine...</p>
      </div>
    );
  }

  // Emergency Fallback Screen
  if (showEmergency) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#1e293b] rounded-2xl p-8 border border-red-500/30 shadow-2xl">
          <h2 className="text-2xl font-bold text-red-500 mb-4">⚠️ Connection Timeout</h2>
          <p className="text-slate-300 mb-6">
            The application is taking too long to load. This might be due to a poor network connection or a paused Supabase project.
          </p>
          <div className="space-y-4">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all"
            >
              Reload Application
            </button>

            <button
              onClick={() => {
                if (window.confirm("Clear all local data and logout?")) {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }
              }}
              className="w-full py-3 bg-[#0f172a] border border-slate-600 hover:border-red-500 text-slate-400 hover:text-red-400 rounded-lg font-bold transition-all"
            >
              Factory Reset (Clear Cache)
            </button>

            <button
              onClick={() => {
                authFirebase.logoutUser().then(() => window.location.reload());
              }}
              className="w-full py-3 bg-[#0f172a] border border-slate-600 hover:border-white text-white rounded-lg font-bold transition-all"
            >
              Force Logout
            </button>
          </div>
          <div className="mt-8 text-center">
            <span className="text-[10px] text-slate-600 font-mono">DEBUG: v2.1-EMERGENCY | {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
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
