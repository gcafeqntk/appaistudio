import React, { useState, useEffect } from 'react';
import { appConfigService } from '../services/appConfigService';

interface AppConfigModalProps {
    currentNames: Record<string, string>;
    onClose: () => void;
    onUpdate: () => void; // Trigger refresh in parent
}

const DEFAULT_APP_NAMES: Record<string, string> = {
    'video-viral': 'Video Viral Engine',
    'image-script': 'Visual Script Engine',
    'zenshot-ai': 'ZenShot AI (New)',
    'translation': 'Translation AI',
    'new-tool': 'New Application'
};

const AppConfigModal: React.FC<AppConfigModalProps> = ({ currentNames, onClose, onUpdate }) => {
    const [editedNames, setEditedNames] = useState<Record<string, string>>(currentNames);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Merge defaults with current names to ensure all apps are listed
        setEditedNames({ ...DEFAULT_APP_NAMES, ...currentNames });
    }, [currentNames]);

    const handleChange = (key: string, value: string) => {
        setEditedNames(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Save all names at once
            await appConfigService.saveAppConfig(editedNames);

            onUpdate(); // Refresh data in parent
            onClose();
        } catch (error) {
            console.error("Failed to save app names", error);
            alert("Failed to save changes. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200]">
            <div className="bg-slate-900 rounded-3xl border border-indigo-500/20 shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-indigo-500/10 bg-indigo-500/5">
                    <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
                        <span className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </span>
                        Manage App Names
                    </h2>
                    <p className="text-slate-400 text-xs mt-2 ml-14">
                        Customize how application names appear in the navigation bar.
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 custom-scrollbar">
                    {Object.keys(DEFAULT_APP_NAMES).map((appKey) => (
                        <div key={appKey} className="group">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-hover:text-indigo-400 transition-colors">
                                {appKey.replace('-', ' ')}
                            </label>
                            <input
                                type="text"
                                value={editedNames[appKey] || ''}
                                onChange={(e) => handleChange(appKey, e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                placeholder={DEFAULT_APP_NAMES[appKey]}
                            />
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-indigo-500/10 bg-slate-800/20 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-slate-400 font-bold text-xs uppercase tracking-wider hover:text-white hover:bg-white/5 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AppConfigModal;
