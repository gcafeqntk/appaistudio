
import React, { useState, useRef, useEffect, Component, ErrorInfo } from 'react';
import {
    analyzeOpponentScript,
    generateIdeas,
    buildOutline,
    writeFinalScript,
    designCharacters,
    analyzeActionsForTag,
    recommendStyle,
    setGeminiKeys
} from '../services/gemini';
import { AppState, TagData, ActionDetail } from '../types';

const VISUAL_STYLES = [
    { id: "Cinematic Realistic", label: "Cinematic High-End Realistic (Điện ảnh thực tế cao cấp)" },
    { id: "3D Pixar Animation", label: "3D Pixar/Disney Style Animation (Hoạt hình 3D Pixar/Disney)" },
    { id: "Japanese Anime 90s", label: "Classic 90s Japanese Anime (Hoạt hình Nhật Bản thập niên 90)" },
    { id: "Modern Makoto Shinkai", label: "Makoto Shinkai Cinematic Style (Phong cách Makoto Shinkai hiện đại)" },
    { id: "Studio Ghibli Aesthetic", label: "Studio Ghibli Hand-painted Aesthetic (Phong cách vẽ tay Ghibli)" },
    { id: "Cyberpunk Neon 2077", label: "Cyberpunk Neon / Sci-Fi Futurism (Tương lai viễn tưởng Neon)" },
    { id: "Hyper-realistic 8K Photo", label: "Hyper-realistic 8K RAW Photography (Nhiếp ảnh siêu thực 8K)" },
    { id: "Spider-Verse Vibrant Comic", label: "Into the Spider-Verse Vibrant Comic (Truyện tranh phong cách Spider-Verse)" },
    { id: "Vintage 16mm Film", label: "Vintage 16mm Grainy Film Style (Phim nhựa 16mm cổ điển)" },
    { id: "Noir Black and White", label: "Classic Film Noir / Moody Black & White (Phim đen trắng Noir sâu lắng)" },
    { id: "Oil Painting Impressionism", label: "Classic Oil Painting / Impressionist Art (Tranh sơn dầu ấn tượng)" },
    { id: "Lo-fi Aesthetic Retro", label: "Lo-fi / Vaporwave Retro Aesthetic (Phong cách Lo-fi cổ điển)" },
    { id: "Claymation Stop Motion", label: "Claymation Claymation Style (Hoạt hình đất sét)" },
    { id: "Minimalist Vector Art", label: "Clean Minimalist Vector Illustration (Minh họa Vector tối giản)" },
    { id: "Dark Fantasy Gothic", label: "Dark Fantasy / Gothic Horror Style (Giả tưởng đen tối / Gothic)" },
    { id: "Ukiyo-e Woodblock", label: "Traditional Japanese Ukiyo-e Woodblock (Tranh khắc gỗ Nhật Bản)" },
    { id: "Surrealist Dreamscape", label: "Surrealist / Dreamlike Visual Art (Nghệ thuật siêu thực ảo mộng)" },
    { id: "Paper Cutout Collage", label: "Hand-crafted Paper Cutout Collage (Cắt dán giấy thủ công)" },
    { id: "Sketch Graphite Art", label: "Detailed Graphite Pencil Sketch (Phác thảo bút chì chi tiết)" },
    { id: "Glitch Art Digital", label: "Experimental Glitch Art / Digital Distortion (Nghệ thuật lỗi kỹ thuật số)" }
];

// --- COMPONENT: ErrorBoundary ---
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
    state = { hasError: false, error: null };

    constructor(props: { children: React.ReactNode }) {
        super(props);
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("ErrorBoundary caught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 m-8 bg-slate-900 border border-slate-700 rounded-3xl space-y-4 text-center text-white">
                    <h2 className="text-xl font-bold text-rose-500">Đã xảy ra lỗi hiển thị</h2>
                    <p className="text-slate-300">{this.state.error?.message}</p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="px-6 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-200 transition-all"
                    >
                        Thử lại
                    </button>
                    <p className="text-xs text-slate-500">Dữ liệu vẫn được lưu trong bộ nhớ tạm.</p>
                </div>
            );
        }
        return this.props.children;
    }
}

interface VideoViralAppProps {
    userId: string;
}

const VideoViralApp: React.FC<VideoViralAppProps> = ({ userId }) => {
    const [state, setState] = useState<AppState>({
        opponentScript: '',
        skeleton: null,
        ideas: [],
        selectedIdeaIndex: null,
        outlines: {},
        finalScripts: {},
        selectedStyle: VISUAL_STYLES[0].id,
        characters: [],
        tags: {},
        showCharacterSection: false,
        loading: {
            analysis: false,
            ideas: false,
            outline: false,
            script: false,
            characters: false
        }
    });

    // API Key State
    const [apiKey, setApiKey] = useState('');

    // Load API Keys
    useEffect(() => {
        if (!userId) return;
        const storageKey = `app_api_keys_${userId}`;
        const storedKeys = localStorage.getItem(storageKey);
        if (storedKeys) {
            try {
                const parsed = JSON.parse(storedKeys);
                const decoded = atob(parsed.gemini || '');
                const keys = decoded.split('\n').map(k => k.trim()).filter(k => k);
                if (keys.length > 0) {
                    setApiKey(keys.join('\n'));
                    setGeminiKeys(keys); // Initialize service with keys
                }
            } catch (e) {
                console.error("Failed to load Gemini keys", e);
            }
        }
    }, [userId]);

    // Notification State
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const styleSectionRef = useRef<HTMLDivElement>(null);

    const calculateCount = (text: string) => {
        const isCJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\uac00-\ud7af]/.test(text);
        if (isCJK) return text.replace(/\s/g, '').length;
        return text.trim().split(/\s+/).filter(Boolean).length;
    };

    const handleAnalyze = async () => {
        if (!state.opponentScript.trim()) return;
        setState(prev => ({ ...prev, loading: { ...prev.loading, analysis: true } }));
        try {
            const result = await analyzeOpponentScript(state.opponentScript, apiKey);
            const count = calculateCount(state.opponentScript);
            const styleMatch = result.split(/PHONG CÁCH ĐỐI THỦ/i);
            const style = styleMatch.length > 1 ? styleMatch[1].trim() : "Tự nhiên, viral";
            setState(prev => ({
                ...prev,
                skeleton: { content: result, wordCount: count, style },
                loading: { ...prev.loading, analysis: false }
            }));
        } catch (error) {
            console.error(error);
            showNotification("Lỗi Phân tích: " + (error instanceof Error ? error.message : String(error)), 'error');
            setState(prev => ({ ...prev, loading: { ...prev.loading, analysis: false } }));
        }
    };

    const handleGenerateIdeas = async () => {
        if (!state.skeleton) return;
        setState(prev => ({ ...prev, loading: { ...prev.loading, ideas: true } }));
        try {
            const ideas = await generateIdeas(state.skeleton.content, apiKey);
            setState(prev => ({ ...prev, ideas, loading: { ...prev.loading, ideas: false } }));
        } catch (error) {
            console.error(error);
            showNotification("Lỗi Sinh ý tưởng: " + (error instanceof Error ? error.message : String(error)), 'error');
            setState(prev => ({ ...prev, loading: { ...prev.loading, ideas: false } }));
        }
    };

    const handleBuildOutline = async (index: number) => {
        if (!state.skeleton || !state.ideas[index]) return;
        setState(prev => ({ ...prev, selectedIdeaIndex: index, loading: { ...prev.loading, outline: true } }));
        try {
            const outline = await buildOutline(state.skeleton.content, state.ideas[index], state.skeleton.wordCount, apiKey);
            setState(prev => ({ ...prev, outlines: { ...prev.outlines, [index]: outline }, loading: { ...prev.loading, outline: false } }));
        } catch (error) {
            console.error(error);
            showNotification("Lỗi Lập dàn ý: " + (error instanceof Error ? error.message : String(error)), 'error');
            setState(prev => ({ ...prev, loading: { ...prev.loading, outline: false } }));
        }
    };

    const handleWriteScript = async (index: number) => {
        if (!state.outlines[index] || !state.skeleton) return;
        setState(prev => ({ ...prev, loading: { ...prev.loading, script: true } }));
        try {
            const script = await writeFinalScript(state.outlines[index], state.skeleton.style, apiKey);
            setState(prev => ({ ...prev, finalScripts: { ...prev.finalScripts, [index]: script }, loading: { ...prev.loading, script: false } }));
        } catch (error) {
            console.error(error);
            showNotification("Lỗi Viết kịch bản: " + (error instanceof Error ? error.message : String(error)), 'error');
            setState(prev => ({ ...prev, loading: { ...prev.loading, script: false } }));
        }
    };

    const handleInitCharacterSection = async () => {
        const currentIdx = state.selectedIdeaIndex;
        const finalScript = currentIdx !== null ? state.finalScripts[currentIdx] : null;

        setState(prev => ({ ...prev, showCharacterSection: true }));

        // Auto-scroll to style section
        setTimeout(() => {
            styleSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);

        // Auto-recommend style if script exists
        if (finalScript) {
            try {
                const recommendedId = await recommendStyle(finalScript, VISUAL_STYLES.map(s => s.id), apiKey);
                const matched = VISUAL_STYLES.find(s => s.id === recommendedId || recommendedId.includes(s.id));
                if (matched) {
                    setState(prev => ({ ...prev, selectedStyle: matched.id }));
                }
            } catch (err) {
                console.error("Style recommendation failed", err);
            }
        }
    };

    const handleDesignCharacters = async () => {
        const currentIdx = state.selectedIdeaIndex;
        if (currentIdx === null || !state.finalScripts[currentIdx]) return;
        setState(prev => ({ ...prev, loading: { ...prev.loading, characters: true } }));
        try {
            const chars = await designCharacters(state.finalScripts[currentIdx], state.selectedStyle, apiKey);
            setState(prev => ({ ...prev, characters: chars, loading: { ...prev.loading, characters: false } }));
        } catch (error) {
            console.error(error);
            showNotification("Lỗi Thiết kế NV: " + (error instanceof Error ? error.message : String(error)), 'error');
            setState(prev => ({ ...prev, loading: { ...prev.loading, characters: false } }));
        }
    };

    const handleSplitTagsAndProcess = (index: number) => {
        const script = state.finalScripts[index];
        if (!script) return;

        const MAX_CHARS = 2000;
        let chunks: string[] = [];
        if (script.length <= MAX_CHARS) {
            chunks = [script];
        } else {
            let current = script;
            while (current.length > 0) {
                let splitPos = current.lastIndexOf('\n', MAX_CHARS);
                if (splitPos === -1 || splitPos < 500) splitPos = MAX_CHARS;
                chunks.push(current.substring(0, splitPos).trim());
                current = current.substring(splitPos).trim();
            }
        }

        const tagData: TagData[] = chunks.map(content => ({
            content,
            actions: [],
            isAnalyzing: false
        }));

        setState(prev => ({
            ...prev,
            tags: { ...prev.tags, [index]: tagData }
        }));
    };

    const handleAnalyzeTag = async (ideaIdx: number, tagIdx: number) => {
        const tag = state.tags[ideaIdx]?.[tagIdx];
        if (!tag || !state.characters.length) {
            showNotification("Vui lòng thực hiện bước 'Thiết kế Nhân Vật' trước khi phân tích hành động.", 'info');
            return;
        }

        setState(prev => {
            const newTags = { ...prev.tags };
            const ideaTags = [...(newTags[ideaIdx] || [])];
            if (ideaTags[tagIdx]) {
                ideaTags[tagIdx] = { ...ideaTags[tagIdx], isAnalyzing: true };
            }
            newTags[ideaIdx] = ideaTags;
            return { ...prev, tags: newTags };
        });

        try {
            const actions = await analyzeActionsForTag(tag.content, state.selectedStyle, state.characters, apiKey);
            setState(prev => {
                const newTags = { ...prev.tags };
                const ideaTags = [...(newTags[ideaIdx] || [])];
                if (ideaTags[tagIdx]) {
                    ideaTags[tagIdx] = { ...ideaTags[tagIdx], actions, isAnalyzing: false };
                }
                newTags[ideaIdx] = ideaTags;
                return { ...prev, tags: newTags };
            });
        } catch (error) {
            console.error(error);
            showNotification("Lỗi Phân tích Tag: " + (error instanceof Error ? error.message : String(error)), 'error');
            setState(prev => {
                const newTags = { ...prev.tags };
                const ideaTags = [...(newTags[ideaIdx] || [])];
                if (ideaTags[tagIdx]) {
                    ideaTags[tagIdx] = { ...ideaTags[tagIdx], isAnalyzing: false };
                }
                newTags[ideaIdx] = ideaTags;
                return { ...prev, tags: newTags };
            });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showNotification("Đã sao chép prompt!", 'success');
    };

    const copyAllPrompts = (actions: ActionDetail[], type: 'image' | 'video') => {
        const text = actions
            .map(act => type === 'image' ? act.imagePrompt : act.motionPrompt)
            .join('\n');
        navigator.clipboard.writeText(text);
        showNotification(`Đã sao chép tất cả prompt ${type === 'image' ? 'hình ảnh' : 'video'}!`, 'success');
    };

    return (
        <ErrorBoundary>
            <React.Fragment>
                {notification && (
                    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right fade-in duration-300">
                        <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm ${notification.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                            notification.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                'bg-white text-slate-700 border border-slate-100'
                            }`}>
                            {notification.type === 'success' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                            {notification.type === 'error' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            {notification.message}
                        </div>
                    </div>
                )}
                <main className="w-full grid grid-cols-1 md:grid-cols-10 gap-8 p-4 md:p-10">

                    {/* LEFT COLUMN (Cột 1 - 3/10) */}
                    <div className="md:col-span-3 space-y-10">

                        {/* Section 1: Input */}
                        <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 group transition-all">
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-6 flex items-center gap-3">
                                <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
                                Kịch bản đối thủ
                            </h2>
                            <textarea
                                className="w-full h-80 p-6 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-8 focus:ring-indigo-600/5 focus:border-indigo-600/20 focus:bg-white outline-none transition-all text-sm leading-relaxed placeholder:text-slate-300 font-medium custom-scrollbar mb-6"
                                placeholder="Dán kịch bản đối thủ vào đây..."
                                value={state.opponentScript}
                                onChange={(e) => setState(prev => ({ ...prev, opponentScript: e.target.value }))}
                            />
                            <button
                                onClick={handleAnalyze}
                                disabled={state.loading.analysis || !state.opponentScript}
                                className="w-full bg-[#020617] hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-300 text-white font-black py-6 rounded-2xl transition-all shadow-2xl hover:scale-[1.02] active:scale-95 flex justify-center items-center gap-4 text-sm uppercase tracking-widest"
                            >
                                {state.loading.analysis ? "Đang xử lý..." : "Phân tích Cấu trúc & Phong cách"}
                            </button>
                        </section>

                        {/* Section: Skeleton */}
                        {state.skeleton && (
                            <div className="space-y-8 animate-in slide-in-from-left-8 duration-700">
                                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                                    <h3 className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-[0.3em]">Quantitative Data</h3>
                                    <div className="text-5xl font-black italic tracking-tighter">
                                        {state.skeleton.wordCount} <span className="text-xs font-bold uppercase opacity-60">Units</span>
                                    </div>
                                </div>

                                <section className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
                                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter mb-6">Khung xương Logic</h2>
                                    <div className="max-h-96 overflow-y-auto pr-4 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium custom-scrollbar">
                                        {state.skeleton.content}
                                    </div>
                                    <button
                                        onClick={handleGenerateIdeas}
                                        disabled={state.loading.ideas}
                                        className="w-full mt-8 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-100 text-white font-black py-6 rounded-2xl transition-all shadow-xl hover:scale-[1.02] active:scale-95 uppercase tracking-widest text-xs"
                                    >
                                        SINH 5 Ý TƯỞNG LIÊN QUAN
                                    </button>
                                </section>
                            </div>
                        )}

                        {/* Section: Styles & NV */}
                        {state.showCharacterSection && (
                            <div ref={styleSectionRef} className="animate-in fade-in slide-in-from-bottom-12 duration-1000 space-y-8">
                                <section className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
                                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter mb-6">Bộ lọc Phong cách</h2>
                                    <div className="space-y-6 mb-8">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Visual Architecture</label>
                                        <select
                                            value={state.selectedStyle}
                                            onChange={(e) => setState(prev => ({ ...prev, selectedStyle: e.target.value }))}
                                            className="w-full p-5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 outline-none text-sm font-bold text-slate-800 transition-all cursor-pointer"
                                        >
                                            {VISUAL_STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleDesignCharacters}
                                        disabled={state.loading.characters}
                                        className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-100 text-white font-black py-6 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-95 uppercase tracking-widest text-xs"
                                    >
                                        Thiết kế Nhân Vật
                                    </button>
                                </section>

                                {state.characters.length > 0 && (
                                    <div className="space-y-6">
                                        {state.characters.map((char, i) => (
                                            <div key={i} className="bg-[#020617] text-white p-8 rounded-[2rem] border-l-[10px] border-amber-500 shadow-3xl">
                                                <input
                                                    className="bg-transparent border-none text-2xl font-black text-white tracking-tighter mb-1 w-full focus:ring-0 placeholder-white/30"
                                                    value={char.name}
                                                    onChange={(e) => {
                                                        const updated = [...state.characters];
                                                        updated[i].name = e.target.value;
                                                        setState(prev => ({ ...prev, characters: updated }));
                                                    }}
                                                    placeholder="Tên nhân vật"
                                                />
                                                <div className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest mb-4">Neural Casting Profile</div>
                                                <div className="grid grid-cols-2 gap-4 text-[11px] mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="opacity-40 uppercase whitespace-nowrap">G.Tính:</span>
                                                        <input
                                                            className="bg-white/10 rounded px-2 py-1 w-full border-none focus:ring-1 focus:ring-amber-500 text-white"
                                                            value={char.gender}
                                                            onChange={(e) => {
                                                                const updated = [...state.characters];
                                                                updated[i].gender = e.target.value;
                                                                setState(prev => ({ ...prev, characters: updated }));
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="opacity-40 uppercase whitespace-nowrap">Tuổi:</span>
                                                        <input
                                                            className="bg-white/10 rounded px-2 py-1 w-full border-none focus:ring-1 focus:ring-amber-500 text-white"
                                                            value={char.age}
                                                            onChange={(e) => {
                                                                const updated = [...state.characters];
                                                                updated[i].age = e.target.value;
                                                                setState(prev => ({ ...prev, characters: updated }));
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 col-span-2">
                                                        <span className="opacity-40 uppercase whitespace-nowrap">Quốc tịch:</span>
                                                        <input
                                                            className="bg-white/10 rounded px-2 py-1 w-full border-none focus:ring-1 focus:ring-amber-500 text-white"
                                                            value={char.country}
                                                            onChange={(e) => {
                                                                const updated = [...state.characters];
                                                                updated[i].country = e.target.value;
                                                                setState(prev => ({ ...prev, characters: updated }));
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 col-span-2">
                                                        <span className="opacity-40 uppercase whitespace-nowrap">Dáng người:</span>
                                                        <input
                                                            className="bg-white/10 rounded px-2 py-1 w-full border-none focus:ring-1 focus:ring-amber-500 text-white"
                                                            value={char.bodyType}
                                                            onChange={(e) => {
                                                                const updated = [...state.characters];
                                                                updated[i].bodyType = e.target.value;
                                                                setState(prev => ({ ...prev, characters: updated }));
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-white/10">
                                                    <label className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">Đặc điểm khuôn mặt (Trung tính)</label>
                                                    <textarea
                                                        className="w-full bg-white/5 rounded-xl p-3 text-xs text-slate-300 italic leading-relaxed border border-white/10 focus:ring-1 focus:ring-amber-500 outline-none resize-none h-24"
                                                        value={char.facialDetails}
                                                        onChange={(e) => {
                                                            const updated = [...state.characters];
                                                            updated[i].facialDetails = e.target.value;
                                                            setState(prev => ({ ...prev, characters: updated }));
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN (Cột 2 - 7/10) */}
                    <div className="md:col-span-7 space-y-12">

                        {state.ideas.length > 0 ? (
                            <div className="space-y-16 animate-in fade-in zoom-in-95 duration-1000">
                                <div className="flex items-center justify-between border-b-4 border-slate-100 pb-8">
                                    <div className="flex items-center gap-6">
                                        <div className="bg-[#020617] text-white w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black shadow-2xl">#</div>
                                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Production Suite</h2>
                                    </div>
                                </div>

                                {state.ideas.map((idea, idx) => (
                                    <div key={idx} className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 p-10 md:p-16 space-y-12 transition-all hover:border-indigo-200">
                                        {/* Idea Card */}
                                        <div className="space-y-8">
                                            <div className="flex items-center gap-4">
                                                <span className="bg-indigo-600 text-white text-[11px] font-black px-6 py-2 rounded-full uppercase">Module {idx + 1}</span>
                                                <span className="text-rose-500 text-xs font-black uppercase tracking-widest">{idea.highlightValue}</span>
                                            </div>
                                            <h3 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">{idea.title}</h3>
                                            <p className="text-xl text-slate-500 leading-relaxed font-medium">{idea.description}</p>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                                                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                                                    <div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Environment Context</div>
                                                    <p className="font-bold text-slate-700">{idea.charactersContext}</p>
                                                </div>
                                                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                                                    <div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Growth Potential</div>
                                                    <p className="font-bold text-slate-700">{idea.viralPotential}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Build Phase */}
                                        <div className="pt-12 border-t-2 border-slate-50 space-y-12">
                                            {!state.outlines[idx] ? (
                                                <button
                                                    onClick={() => handleBuildOutline(idx)}
                                                    disabled={state.loading.outline}
                                                    className="bg-[#020617] text-white px-12 py-8 rounded-2xl font-black shadow-2xl hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest"
                                                >
                                                    {state.loading.outline && state.selectedIdeaIndex === idx ? "Kiến trúc..." : "Chọn & Lập dàn ý"}
                                                </button>
                                            ) : (
                                                <div className="space-y-16">
                                                    {/* Outline Card */}
                                                    <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-12 shadow-inner">
                                                        <h4 className="text-slate-900 font-black mb-8 uppercase tracking-[0.4em] text-[10px] flex items-center gap-3">
                                                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span> Structural Protocol
                                                        </h4>
                                                        <div className="whitespace-pre-wrap text-base text-slate-600 leading-[2] font-medium opacity-80 max-h-[500px] overflow-y-auto pr-8 custom-scrollbar">
                                                            {state.outlines[idx]}
                                                        </div>
                                                        {!state.finalScripts[idx] && (
                                                            <button
                                                                onClick={() => handleWriteScript(idx)}
                                                                disabled={state.loading.script}
                                                                className={`mt-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-12 py-8 rounded-2xl shadow-2xl transition-all uppercase tracking-widest text-xs ${state.loading.script ? 'opacity-30 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'}`}
                                                            >
                                                                {state.loading.script ? "Đang viết..." : "Viết kịch bản hoàn chỉnh"}
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Final Script Copy */}
                                                    {state.finalScripts[idx] && (
                                                        <div className="space-y-12 animate-in zoom-in-95 duration-[1200ms]">
                                                            <div className="bg-[#020617] text-white rounded-[3.5rem] p-16 lg:p-24 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]">
                                                                <h4 className="text-indigo-400 font-black uppercase text-xs tracking-[0.5em] border-b border-white/5 pb-8 mb-12">Final Master Copy</h4>
                                                                <div className="whitespace-pre-wrap text-lg lg:text-xl font-bold tracking-tight leading-relaxed text-slate-100">
                                                                    {state.finalScripts[idx]}
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                                <button
                                                                    onClick={handleInitCharacterSection}
                                                                    className="bg-amber-500 hover:bg-amber-600 text-white font-black px-12 py-10 rounded-3xl shadow-2xl transition-all hover:scale-[1.03] active:scale-95 flex flex-col items-center gap-4 text-center group"
                                                                >
                                                                    <svg className="w-8 h-8 group-hover:rotate-45 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                                                    <div>
                                                                        <div className="text-xl">Thiết lập Styles & NV</div>
                                                                        <div className="text-[10px] opacity-60 mt-2 uppercase tracking-widest">Tiếp tục thiết kế hình ảnh</div>
                                                                    </div>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleSplitTagsAndProcess(idx)}
                                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-12 py-10 rounded-3xl shadow-2xl transition-all hover:scale-[1.03] active:scale-95 flex flex-col items-center gap-4 text-center group"
                                                                >
                                                                    <svg className="w-8 h-8 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                                    <div>
                                                                        <div className="text-xl">Bắt Đầu Chia TAGS</div>
                                                                        <div className="text-[10px] opacity-60 mt-2 uppercase tracking-widest">Shot Decomposition</div>
                                                                    </div>
                                                                </button>
                                                            </div>

                                                            {/* Tags Production Area */}
                                                            {state.tags[idx] && (
                                                                <div className="space-y-16 pt-24 border-t-8 border-slate-100">
                                                                    <h3 className="text-5xl font-black text-slate-900 tracking-tighter italic">Alpha Production Tags</h3>

                                                                    {state.tags[idx].map((tag, tagIdx) => (
                                                                        <div key={tagIdx} className="bg-white border-4 border-slate-50 rounded-[4rem] p-12 md:p-16 space-y-12 shadow-sm transition-all animate-in slide-in-from-bottom-16 duration-700">
                                                                            <div className="flex flex-wrap items-center justify-between gap-8">
                                                                                <div className="flex items-center gap-6">
                                                                                    <div className="bg-[#020617] text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest">TAG #{tagIdx + 1}</div>
                                                                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{calculateCount(tag.content)} units identified</div>
                                                                                </div>
                                                                                <div className="flex gap-4">
                                                                                    <button
                                                                                        onClick={() => copyAllPrompts(tag.actions, 'image')}
                                                                                        disabled={tag.actions.length === 0}
                                                                                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm border border-rose-100 disabled:opacity-30"
                                                                                    >
                                                                                        Copy All Ảnh
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => copyAllPrompts(tag.actions, 'video')}
                                                                                        disabled={tag.actions.length === 0}
                                                                                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm border border-indigo-100 disabled:opacity-30"
                                                                                    >
                                                                                        Copy All Video
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleAnalyzeTag(idx, tagIdx)}
                                                                                        disabled={tag.isAnalyzing}
                                                                                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 text-white font-black px-10 py-4 rounded-xl text-xs transition-all shadow-xl uppercase tracking-widest"
                                                                                    >
                                                                                        {tag.isAnalyzing ? "Processing..." : "Tạo Motion Prompts"}
                                                                                    </button>
                                                                                </div>
                                                                            </div>

                                                                            <div className="p-10 bg-slate-50 rounded-[2.5rem] text-slate-500 text-lg italic font-medium leading-relaxed border-2 border-slate-100">
                                                                                {tag.content}
                                                                            </div>

                                                                            {tag.actions.length > 0 && (
                                                                                <div className="grid grid-cols-1 gap-12 mt-12">
                                                                                    {tag.actions.map((act, actIdx) => (
                                                                                        <div key={actIdx} className="space-y-8 animate-in slide-in-from-bottom-12 duration-1000">
                                                                                            <div className="flex items-center gap-6">
                                                                                                <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-sm">{actIdx + 1}</div>
                                                                                                <div className="h-px flex-1 bg-slate-100"></div>
                                                                                            </div>

                                                                                            <div className="grid grid-cols-1 gap-8">
                                                                                                {/* Action Info */}
                                                                                                <div className="bg-[#020617] text-white p-10 rounded-[2.5rem] shadow-3xl">
                                                                                                    <div className="text-[10px] font-black uppercase text-indigo-400 mb-4 tracking-widest">Shot Execution</div>
                                                                                                    <div className="text-xl font-bold leading-relaxed">{act.action}</div>
                                                                                                </div>

                                                                                                {/* Voice Transcript */}
                                                                                                <div className="bg-indigo-50 border-l-[10px] border-indigo-400 p-10 rounded-[2.5rem] shadow-inner">
                                                                                                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Master Transcript</div>
                                                                                                    <div className="text-xl font-bold text-indigo-900 italic font-serif">
                                                                                                        {act.voiceText ? `"${act.voiceText}"` : "--- Instrumental Segment ---"}
                                                                                                    </div>
                                                                                                </div>

                                                                                                {/* Prompts Section */}
                                                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                                                                    {/* Video Prompt */}
                                                                                                    <div className="bg-[#FFF1F2] border-l-[10px] border-rose-400 p-10 rounded-[2.5rem] relative group shadow-lg">
                                                                                                        <div className="flex items-center justify-between mb-4">
                                                                                                            <div className="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em]">Video Motion AI Prompt</div>
                                                                                                            <button onClick={() => copyToClipboard(act.motionPrompt)} className="bg-white/80 hover:bg-white p-2 rounded-lg text-rose-500 shadow-sm transition-all active:scale-90">
                                                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                                                                                            </button>
                                                                                                        </div>
                                                                                                        <div className="text-sm font-bold text-rose-950 leading-relaxed italic bg-white/40 p-6 rounded-2xl border border-rose-200">
                                                                                                            {act.motionPrompt}
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    {/* Image Prompt */}
                                                                                                    <div className="bg-emerald-50 border-l-[10px] border-emerald-400 p-10 rounded-[2.5rem] relative group shadow-lg">
                                                                                                        <div className="flex items-center justify-between mb-4">
                                                                                                            <div className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Stable Image AI Prompt</div>
                                                                                                            <button onClick={() => copyToClipboard(act.imagePrompt)} className="bg-white/80 hover:bg-white p-2 rounded-lg text-emerald-500 shadow-sm transition-all active:scale-90">
                                                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                                                                                            </button>
                                                                                                        </div>
                                                                                                        <div className="text-sm font-bold text-emerald-950 leading-relaxed italic bg-white/40 p-6 rounded-2xl border border-emerald-200">
                                                                                                            {act.imagePrompt}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full min-h-[900px] flex flex-col items-center justify-center text-slate-200 space-y-16 border-8 border-dashed border-slate-100 rounded-[6rem] bg-white/50 backdrop-blur-3xl group hover:border-indigo-100 transition-all duration-[2000ms]">
                                <div className="relative">
                                    <div className="w-56 h-56 bg-white rounded-[4.5rem] flex items-center justify-center shadow-3xl group-hover:rotate-12 transition-all">
                                        <svg className="w-24 h-24 text-slate-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                    </div>
                                </div>
                                <div className="text-center space-y-6">
                                    <h3 className="text-4xl font-black italic uppercase tracking-[0.5em] text-slate-300">Quang Huy Production</h3>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest opacity-40 italic">Waiting for initial data analysis to start production sequence...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                <footer className="w-full p-20 text-center border-t border-slate-100 bg-white mt-40">
                    <h4 className="text-2xl font-black tracking-tighter uppercase text-[#020617]">QUANG HUY <span className="text-indigo-600">VIDEO</span></h4>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 mt-4">AI Viral Content Engine © 2024</p>
                </footer>
            </React.Fragment>
        </ErrorBoundary>
    );
};

export default VideoViralApp;
