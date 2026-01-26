
import React, { useState, useEffect } from 'react';
import { setGeminiKeys } from '../services/gemini';

interface ApiKeyManagerProps {
    userId: string;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ userId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(false); // Toggle for masking keys
    const [keys, setKeys] = useState<{
        gemini: string;
        chatgpt: string;
        openrouter: string;
    }>({
        gemini: '',
        chatgpt: '',
        openrouter: ''
    });
    const [showToast, setShowToast] = useState(false);

    // Simple obfuscation
    const encode = (str: string) => {
        try { return btoa(str); } catch (e) { return str; }
    };

    const decode = (str: string) => {
        try { return atob(str); } catch (e) { return str; }
    };

    const storageKey = `app_api_keys_${userId}`;

    useEffect(() => {
        // Load keys from localStorage on mount (USER ISOLATED)
        const savedKeys = localStorage.getItem(storageKey);

        // Reset keys if switching user and no keys found
        if (!savedKeys) {
            setKeys({ gemini: '', chatgpt: '', openrouter: '' });
            setGeminiKeys([]); // Clear global service
            return;
        }

        if (savedKeys) {
            try {
                const parsed = JSON.parse(savedKeys);
                const decodedKeys = {
                    gemini: decode(parsed.gemini || ''),
                    chatgpt: decode(parsed.chatgpt || ''),
                    openrouter: decode(parsed.openrouter || '')
                };
                setKeys(decodedKeys);

                if (decodedKeys.gemini) {
                    processGeminiKeys(decodedKeys.gemini);
                }
            } catch (e) {
                console.error("Failed to parse keys", e);
            }
        }
    }, [userId]); // Re-run when user changes

    const processGeminiKeys = (input: string) => {
        const keyList = input.split('\n').map(k => k.trim()).filter(k => k !== '');
        setGeminiKeys(keyList);
    };

    const handleSave = () => {
        const hasKey = keys.gemini.trim() !== '' || keys.chatgpt.trim() !== '' || keys.openrouter.trim() !== '';

        if (!hasKey) {
            alert("Lỗi: Bạn phải nhập ít nhất 1 API Key vào một trong 3 mục để tiếp tục!");
            return;
        }

        const keysToSave = {
            gemini: encode(keys.gemini),
            chatgpt: encode(keys.chatgpt),
            openrouter: encode(keys.openrouter)
        };

        localStorage.setItem(storageKey, JSON.stringify(keysToSave));

        if (keys.gemini) {
            processGeminiKeys(keys.gemini);
        }

        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleChange = (provider: keyof typeof keys, value: string) => {
        setKeys(prev => ({ ...prev, [provider]: value }));
    };

    const MaskOverlay = () => (
        <div
            className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center cursor-pointer z-10 rounded-lg border border-slate-700/50"
            onClick={() => setIsVisible(true)}
        >
            <span className="text-slate-400 text-xs font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                Click to Show Keys
            </span>
        </div>
    );

    return (
        <div className="w-full bg-[#0f172a] border-b border-white/10 relative z-[200]">
            <div
                className="px-6 py-2 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest text-slate-400"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    <span>
                        API Configuration Manager
                        <span className="ml-2 text-indigo-400 normal-case tracking-normal opacity-70">
                            (User: {userId.replace('user_', 'Account ')} - {isVisible ? 'Visible' : 'Hidden'})
                        </span>
                        {showToast && <span className="text-emerald-400 ml-4 animate-in fade-in slide-in-from-left-2 normal-case tracking-normal">✓ Saved!</span>}
                    </span>
                </div>
                <div className="flex gap-4 items-center">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsVisible(!isVisible); }}
                        className="text-[10px] bg-slate-800 px-2 py-1 rounded hover:bg-slate-700 transition"
                    >
                        {isVisible ? 'Hide Keys' : 'Show Keys'}
                    </button>
                    <div className="flex gap-4 opacity-50">
                        <span>Gemini: {keys.gemini ? keys.gemini.split('\n').filter(k => k.trim()).length : 0}</span>
                        <span className="opacity-30">|</span>
                        <span>GPT: {keys.chatgpt ? keys.chatgpt.split('\n').filter(k => k.trim()).length : 0}</span>
                        <span className="opacity-30">|</span>
                        <span>OR: {keys.openrouter ? keys.openrouter.split('\n').filter(k => k.trim()).length : 0}</span>
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300 bg-black/20">
                    {/* Gemini */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black text-indigo-400 tracking-widest">
                            Google Gemini Keys
                        </label>
                        <div className="relative group">
                            {!isVisible && <MaskOverlay />}
                            <textarea
                                value={keys.gemini}
                                onChange={(e) => handleChange('gemini', e.target.value)}
                                placeholder="AIzaSy...&#10;AIzaSy..."
                                rows={4}
                                disabled={!isVisible}
                                className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white text-xs font-mono focus:border-indigo-500 focus:ring-1 outline-none transition-all resize-y ${!isVisible ? 'blur-sm select-none' : ''}`}
                            />
                        </div>
                    </div>

                    {/* ChatGPT */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black text-emerald-400 tracking-widest">
                            ChatGPT Keys
                        </label>
                        <div className="relative group">
                            {!isVisible && <MaskOverlay />}
                            <textarea
                                value={keys.chatgpt}
                                onChange={(e) => handleChange('chatgpt', e.target.value)}
                                placeholder="sk-...&#10;sk-..."
                                rows={4}
                                disabled={!isVisible}
                                className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white text-xs font-mono focus:border-emerald-500 focus:ring-1 outline-none transition-all resize-y ${!isVisible ? 'blur-sm select-none' : ''}`}
                            />
                        </div>
                    </div>

                    {/* OpenRouter */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black text-rose-400 tracking-widest">
                            OpenRouter Keys
                        </label>
                        <div className="relative group">
                            {!isVisible && <MaskOverlay />}
                            <textarea
                                value={keys.openrouter}
                                onChange={(e) => handleChange('openrouter', e.target.value)}
                                placeholder="sk-or-...&#10;sk-or-..."
                                rows={4}
                                disabled={!isVisible}
                                className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white text-xs font-mono focus:border-rose-500 focus:ring-1 outline-none transition-all resize-y ${!isVisible ? 'blur-sm select-none' : ''}`}
                            />
                        </div>
                    </div>

                    <div className="md:col-span-3 flex flex-col md:flex-row items-center justify-between mt-2 gap-4">
                        <p className="text-[10px] text-slate-500 italic text-center md:text-left">
                            * Bảo mật: Key lưu riêng cho tài khoản <b>{userId}</b>. <br />
                            Hệ thống tự động xoay vòng key khi chạy.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    const geminiKeys = keys.gemini.split('\n').map(k => k.trim()).filter(k => k !== '');
                                    if (geminiKeys.length === 0) {
                                        alert("Vui lòng nhập và LƯU ít nhất 1 API Key Gemini trước khi test!");
                                        return;
                                    }
                                    const firstKey = geminiKeys[0];
                                    try {
                                        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${firstKey}`);
                                        const data = await response.json();
                                        if (data.error) alert(`Lỗi: ${data.error.message}`);
                                        else if (data.models) {
                                            const modelNames = data.models.map((m: any) => m.name.replace('models/', '')).slice(0, 10).join(', ');
                                            alert(`Kết nối OK! Có ${data.models.length} models:\n${modelNames}`);
                                        }
                                        else alert("Phản hồi lạ: " + JSON.stringify(data));
                                    } catch (e) {
                                        alert("Lỗi mạng: " + (e as Error).message);
                                    }
                                }}
                                className="bg-blue-600/20 text-blue-400 font-bold uppercase text-xs px-6 py-3 rounded-xl hover:bg-blue-600/30 transition-all border border-blue-600/30"
                            >
                                Test Local
                            </button>
                            <button
                                onClick={handleSave}
                                className="bg-white text-slate-900 font-black uppercase text-xs px-8 py-3 rounded-xl hover:bg-slate-200 active:scale-95 transition-all shadow-lg flex items-center gap-2"
                            >
                                Lưu cấu hình (Save)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApiKeyManager;
