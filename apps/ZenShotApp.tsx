
import React, { useState, useRef, useEffect, Component, ErrorInfo } from 'react';
import {
    Camera,
    Play,
    Scissors,
    Copy,
    Upload,
    Image as ImageIcon,
    CheckCircle2,
    Loader2,
    Trash2,
    // Save,
    Activity,
    Zap,
    ClipboardList,
    Layers,
    Video,
    ExternalLink
} from 'lucide-react';
import {
    analyzeImageStyle,
    extractCharacters,
    splitScriptIntoRows,
    generatePrompts,
    analyzeActionCount,
    generateVideoPrompts
} from '../services/image_script_gemini';

// --- TYPES ---
export interface Character {
    name: string;
    gender: string;
    country: string;
    age: string;
    physique: string;
    features: string;
    lastClothing?: string;
}

export interface ScriptTag {
    id: string;
    originalContent: string;
    rows: string[];
    imageCount: number;
    prompts: string[];
    status: 'idle' | 'splitting' | 'generating' | 'ready' | 'analyzing';
    lastBackground?: string;
    actionCount?: number;
}

export interface AppState {
    visualStyle: string;
    script: string;
    characters: Character[];
    tags: ScriptTag[];
    hook: string;
    hookPrompts: string[];
    isAnalyzing: boolean;
    isProcessingScript: boolean;
    isGeneratingHook: boolean;
}

interface ImageScriptAppProps {
    userId: string;
}

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

const ImageScriptApp: React.FC<ImageScriptAppProps> = ({ userId }) => {
    // ... Copied logic from App.tsx ...
    const [state, setState] = useState<AppState>({
        visualStyle: '',
        script: '',
        characters: [],
        tags: [],
        hook: '',
        hookPrompts: [],
        isAnalyzing: false,
        isProcessingScript: false,
        isGeneratingHook: false,
    });

    const [uploadLoading, setUploadLoading] = useState(false);
    const [isAutoRunning, setIsAutoRunning] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);

    // Notification State
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    // Load API Key
    useEffect(() => {
        if (!userId) return;
        try {
            const storageKey = `app_api_keys_${userId}`;
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                const decoded = atob(parsed.gemini || '');
                const keys = decoded.split('\n').map(k => k.trim()).filter(k => k);
                setApiKey(keys.join('\n'));
            }
        } catch (e) {
            console.error("Failed to load API key", e);
        }
    }, [userId]);

    // Synchronize state with a ref to prevent stale closures in async loops
    const tagsRef = useRef<ScriptTag[]>(state.tags);
    useEffect(() => {
        tagsRef.current = state.tags;
    }, [state.tags]);

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const resultStr = event.target?.result as string;
            setUploadedImage(resultStr);
            const base64 = resultStr.split(',')[1];
            try {
                const style = await analyzeImageStyle(base64, apiKey);
                setState(prev => ({ ...prev, visualStyle: style }));
            } catch (err: any) {
                showNotification(`Lỗi phân tích style: ${err.message || err}`, 'error');
            } finally {
                setUploadLoading(false);
            }
        };
        reader.readAsDataURL(file);
    };



    const handleStart = async () => {
        if (!state.script) return;
        setState(prev => ({ ...prev, isProcessingScript: true }));
        try {
            const chars = await extractCharacters(state.script, apiKey);
            setState(prev => ({ ...prev, characters: chars, isProcessingScript: false }));
        } catch (err: any) {
            showNotification(`Lỗi xử lý kịch bản: ${err.message || err}`, 'error');
            setState(prev => ({ ...prev, isProcessingScript: false }));
        }
    };

    const smartSplit = (text: string): string[] => {
        const isCJK = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf\uac00-\ud7af]/.test(text);
        const chunks: string[] = [];
        let remaining = text;
        const minCount = isCJK ? 1800 : 1200;
        const maxCount = isCJK ? 2000 : 1500;
        const delimiters = isCJK ? ['\n', '。', '！', '？', '.', '!', '?'] : ['\n', '.', '!', '?'];

        while (remaining.length > 0) {
            if (isCJK) {
                if (remaining.length <= maxCount) {
                    chunks.push(remaining);
                    break;
                }
                let searchArea = remaining.slice(minCount, maxCount);
                let lastDelimiterIdx = -1;
                for (const d of delimiters) {
                    const idx = searchArea.lastIndexOf(d);
                    if (idx > lastDelimiterIdx) lastDelimiterIdx = idx;
                }
                if (lastDelimiterIdx !== -1) {
                    const splitAt = minCount + lastDelimiterIdx + 1;
                    chunks.push(remaining.slice(0, splitAt));
                    remaining = remaining.slice(splitAt);
                } else {
                    chunks.push(remaining.slice(0, maxCount));
                    remaining = remaining.slice(maxCount);
                }
            } else {
                const segments = remaining.split(/(\s+)/);
                let wordCount = 0;
                let charIndex = 0;
                let splitCandidateCharIdx = -1;
                let found = false;

                for (let i = 0; i < segments.length; i++) {
                    const segment = segments[i];
                    const isWord = /\S/.test(segment);
                    if (isWord) wordCount++;
                    const prevCharIndex = charIndex;
                    charIndex += segment.length;
                    if (wordCount >= minCount && wordCount <= maxCount) {
                        if (delimiters.some(d => segment.includes(d))) {
                            splitCandidateCharIdx = charIndex;
                        }
                    }
                    if (wordCount > maxCount) {
                        const finalSplitIdx = splitCandidateCharIdx !== -1 ? splitCandidateCharIdx : prevCharIndex;
                        chunks.push(remaining.slice(0, finalSplitIdx));
                        remaining = remaining.slice(finalSplitIdx);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    chunks.push(remaining);
                    break;
                }
            }
        }
        return chunks;
    };

    const handleSplitScript = () => {
        if (!state.script) return;
        const chunks = smartSplit(state.script);
        const newTags: ScriptTag[] = chunks.map((content, idx) => ({
            id: `tag-${Date.now()}-${idx}`,
            originalContent: content,
            rows: [content],
            // Default to 10 images as per original logic
            imageCount: 10,
            prompts: [],
            status: 'idle',
        }));
        setState(prev => ({ ...prev, tags: newTags }));
    };

    const updateTag = (id: string, updates: Partial<ScriptTag>) => {
        setState(prev => ({
            ...prev,
            tags: prev.tags.map(t => t.id === id ? { ...t, ...updates } : t)
        }));
    };

    const handleUpdateCharacter = (index: number, updates: Partial<Character>) => {
        setState(prev => ({
            ...prev,
            characters: prev.characters.map((c, i) => i === index ? { ...c, ...updates } : c)
        }));
    };

    const handleSplitRows = async (tagId: string): Promise<boolean> => {
        const tag = tagsRef.current.find(t => t.id === tagId);
        if (!tag) return false;

        updateTag(tagId, { status: 'splitting' });
        try {
            const rows = await splitScriptIntoRows(tag.originalContent, tag.imageCount, apiKey);
            updateTag(tagId, { rows, status: 'ready' });
            return true;
        } catch (err: any) {
            console.error(`Error splitting rows for TAG: ${tagId}`, err);
            showNotification(`Lỗi chia hàng: ${err.message || err}`, 'error');
            updateTag(tagId, { status: 'idle' });
            return false;
        }
    };

    const handleGeneratePrompts = async (tagId: string): Promise<boolean> => {
        const currentTags = tagsRef.current;
        const tagIndex = currentTags.findIndex(t => t.id === tagId);
        if (tagIndex === -1) return false;

        const tag = currentTags[tagIndex];
        let previousContext = "";
        if (tagIndex > 0) {
            const prevTag = currentTags[tagIndex - 1];
            if (prevTag && prevTag.prompts.length > 0) {
                previousContext = `Đây là prompt cuối của Tag trước để bạn kế thừa bối cảnh và trang phục: ${prevTag.prompts[prevTag.prompts.length - 1]}`;
            }
        }

        updateTag(tagId, { status: 'generating' });
        try {
            const result = await generatePrompts(tag.rows, state.visualStyle, state.characters, previousContext, apiKey);
            if (!result.prompts || result.prompts.length === 0) {
                throw new Error("Empty prompts generated");
            }
            updateTag(tagId, { prompts: result.prompts, status: 'ready' });
            return true;
        } catch (err: any) {
            console.error(`Error generating prompts for TAG: ${tagId}`, err);
            updateTag(tagId, { status: 'ready' });
            return false;
        }
    };

    const handleGenerateHookVideo = async () => {
        if (!state.hook || state.characters.length === 0) {
            showNotification("Vui lòng nhập nội dung Hook và đảm bảo đã phân tích nhân vật.", 'info');
            return;
        }

        setState(prev => ({ ...prev, isGeneratingHook: true }));

        // Lấy context từ prompt cuối cùng của tag cuối cùng (nếu có)
        let context = "";
        const lastTag = state.tags[state.tags.length - 1];
        if (lastTag && lastTag.prompts.length > 0) {
            context = `Kế thừa bối cảnh từ prompt này: ${lastTag.prompts[lastTag.prompts.length - 1]}`;
        }

        try {
            const prompts = await generateVideoPrompts(state.hook, state.visualStyle, state.characters, context, apiKey);
            setState(prev => ({ ...prev, hookPrompts: prompts, isGeneratingHook: false }));
        } catch (err: any) {
            showNotification(`Lỗi tạo Prompt Video Hook: ${err.message || err}`, 'error');
            setState(prev => ({ ...prev, isGeneratingHook: false }));
        }
    };

    const handleAnalyzeActionCount = async (tagId: string) => {
        const tag = state.tags.find(t => t.id === tagId);
        if (!tag) return;
        updateTag(tagId, { status: 'analyzing' });
        try {
            const count = await analyzeActionCount(tag.originalContent, apiKey);
            updateTag(tagId, { actionCount: count, status: 'idle' });
        } catch (err: any) {
            showNotification(`Lỗi phân tích hành động: ${err.message || err}`, 'error');
            updateTag(tagId, { status: 'idle' });
        }
    };

    const handleFullAuto = async () => {
        if (state.tags.length === 0) return;
        setIsAutoRunning(true);

        const tagIds = state.tags.map(t => t.id);

        for (const tagId of tagIds) {
            const splitSuccess = await handleSplitRows(tagId);
            if (!splitSuccess) {
                const retrySplit = await handleSplitRows(tagId);
                if (!retrySplit) break;
            }
            await delay(15000);
            let genSuccess = await handleGeneratePrompts(tagId);
            if (!genSuccess) {
                await delay(15000);
                genSuccess = await handleGeneratePrompts(tagId);
            }
            if (!genSuccess) {
                const proceed = confirm(`TAG ${tagId} không thể tạo prompt sau 2 lần thử. Bạn có muốn tiếp tục các TAG sau không?`);
                if (!proceed) break;
            }
            await delay(15000);
        }

        setIsAutoRunning(false);
        showNotification("Hoàn thành quy trình tự động cho tất cả các TAG!", 'success');
    };

    const handleCopyAllScripts = () => {
        // Flatten all lines from all tags based on their current visible segmented content
        const allLines = state.tags.flatMap(tag => {
            const currentContent = (tag.status === 'ready' || tag.status === 'generating')
                ? tag.rows.join('\n')
                : tag.originalContent;

            return currentContent
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
        });

        const finalResult = allLines.join('\n');
        navigator.clipboard.writeText(finalResult);
        showNotification("Đã copy toàn bộ kịch bản của tất cả các TAG!", 'success');
    };

    const handleCopyAllPrompts = () => {
        const allPrompts = state.tags
            .flatMap(tag => tag.prompts)
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .join('\n');
        navigator.clipboard.writeText(allPrompts);
        showNotification("Đã copy toàn bộ Prompt của tất cả các TAG!", 'success');
    };

    const handleCopyHookPrompts = () => {
        const text = state.hookPrompts.join('\n');
        navigator.clipboard.writeText(text);
        showNotification("Đã copy Prompt Video cho Hook!", 'success');
    };

    return (
        <ErrorBoundary>
            <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 w-full relative">
                {notification && (
                    <div className="absolute top-4 right-4 z-50 animate-in slide-in-from-right fade-in duration-300">
                        <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm ${notification.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                            notification.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                'bg-white text-slate-700 border border-slate-100'
                            }`}>
                            {notification.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                            {notification.type === 'error' && <Trash2 className="w-5 h-5" />}
                            {notification.message}
                        </div>
                    </div>
                )}
                <aside className="w-[30%] bg-white border-r border-slate-200 overflow-y-auto p-6 space-y-8 flex flex-col shrink-0">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-indigo-600 p-2 rounded-lg">
                            <Camera className="text-white w-6 h-6" />
                        </div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">ZenShot AI</h1>
                    </div>

                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                            <ImageIcon className="w-3.5 h-3.5" /> Phong cách hình ảnh
                        </label>
                        <div className={`border-2 border-dashed border-slate-200 rounded-xl p-4 transition hover:border-indigo-400 bg-slate-50/50 relative group overflow-hidden ${uploadedImage ? 'border-none p-0' : ''}`}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                                id="image-upload"
                            />
                            <label htmlFor="image-upload" className={`cursor-pointer flex flex-col items-center justify-center gap-2 py-2 w-full h-full ${uploadedImage ? 'p-0' : ''}`}>
                                {uploadLoading ? (
                                    <div className="py-8 flex flex-col items-center">
                                        <Loader2 className="animate-spin text-indigo-500 w-8 h-8" />
                                        <span className="text-[10px] text-indigo-500 font-bold mt-2 uppercase tracking-wider">Đang phân tích...</span>
                                    </div>
                                ) : uploadedImage ? (
                                    <div className="relative w-full h-48">
                                        <img src={uploadedImage} alt="Style Reference" className="w-full h-full object-cover rounded-lg shadow-sm" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                            <div className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest bg-black/50 px-3 py-2 rounded-full backdrop-blur-sm border border-white/20">
                                                <Upload className="w-3 h-3" /> Thay đổi ảnh
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="text-slate-400 w-6 h-6" />
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Phân tích phong cách qua ảnh</span>
                                    </>
                                )}
                            </label>
                        </div>
                        <textarea
                            className="w-full h-24 p-3 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition placeholder:italic"
                            placeholder="Phong cách chi tiết sẽ hiện ở đây..."
                            value={state.visualStyle}
                            onChange={(e) => setState(prev => ({ ...prev, visualStyle: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                            Nhập kịch bản chính
                        </label>
                        <textarea
                            className="w-full h-40 p-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition leading-relaxed"
                            placeholder="Dán kịch bản của bạn vào đây..."
                            value={state.script}
                            onChange={(e) => setState(prev => ({ ...prev, script: e.target.value }))}
                        />
                        <button
                            onClick={handleStart}
                            disabled={state.isProcessingScript || !state.script}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-lg shadow-indigo-100 uppercase text-xs tracking-widest"
                        >
                            {state.isProcessingScript ? <Loader2 className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                            Bắt đầu phân tích kịch bản
                        </button>
                    </div>

                    {state.characters.length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                Thông tin nhân vật (Có thể chỉnh sửa)
                            </label>
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                                {state.characters.map((char, i) => (
                                    <div key={i} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden transition hover:border-indigo-300 group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                        <div className="flex flex-col gap-2">
                                            <input
                                                className="font-black text-slate-800 text-[11px] uppercase bg-transparent border-none p-0 focus:ring-0"
                                                value={char.name}
                                                onChange={(e) => handleUpdateCharacter(i, { name: e.target.value })}
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    className="text-[10px] bg-slate-50 border border-slate-100 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-400"
                                                    value={char.gender}
                                                    placeholder="Gender"
                                                    onChange={(e) => handleUpdateCharacter(i, { gender: e.target.value })}
                                                />
                                                <input
                                                    className="text-[10px] bg-slate-50 border border-slate-100 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-400"
                                                    value={char.age}
                                                    placeholder="Age"
                                                    onChange={(e) => handleUpdateCharacter(i, { age: e.target.value })}
                                                />
                                            </div>
                                            <textarea
                                                className="text-[10px] text-slate-700 leading-relaxed font-medium bg-slate-50 border border-slate-100 rounded p-2 focus:ring-1 focus:ring-indigo-400 resize-none h-20"
                                                value={char.features}
                                                onChange={(e) => handleUpdateCharacter(i, { features: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-auto pt-6">
                        <button
                            onClick={handleSplitScript}
                            disabled={!state.script}
                            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 px-4 rounded-xl transition uppercase text-xs tracking-widest"
                        >
                            <Scissors className="w-4 h-4" />
                            Chia kịch bản sang TAG
                        </button>
                    </div>
                </aside>

                <main className="flex-1 overflow-y-auto bg-slate-50 scroll-smooth flex flex-col">
                    {state.tags.length > 0 && (
                        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleFullAuto}
                                    disabled={isAutoRunning}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95"
                                >
                                    {isAutoRunning ? <Loader2 className="animate-spin w-4 h-4" /> : <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />}
                                    Tự Động Hoàn Toàn
                                </button>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleCopyAllScripts}
                                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95"
                                >
                                    <ClipboardList className="w-4 h-4" />
                                    Copy All Kịch Bản
                                </button>
                                <button
                                    onClick={handleCopyAllPrompts}
                                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95"
                                >
                                    <Layers className="w-4 h-4" />
                                    Copy All Prompt Ảnh
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="max-w-4xl mx-auto space-y-8 p-8 w-full">
                        {state.tags.length === 0 ? (
                            <div className="h-[70vh] flex flex-col items-center justify-center text-slate-300 space-y-6">
                                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                                    <ImageIcon className="w-10 h-10 opacity-40" />
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-bold text-slate-400">ZenShot Visual Director</p>
                                    <p className="text-sm text-slate-400 mt-1 uppercase tracking-widest font-bold opacity-60">Split script and start generating prompts</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {state.tags.map((tag, idx) => (
                                    <TagCard
                                        key={tag.id}
                                        tag={tag}
                                        index={idx}
                                        onSplit={() => handleSplitRows(tag.id)}
                                        onAnalyze={() => handleAnalyzeActionCount(tag.id)}
                                        onGenerate={() => handleGeneratePrompts(tag.id)}
                                        onUpdateCount={(count) => updateTag(tag.id, { imageCount: count })}
                                        onCopy={() => {
                                            const text = tag.prompts.map(p => p.trim()).join('\n');
                                            navigator.clipboard.writeText(text);
                                            showNotification("Copied prompts for this TAG!", 'success');
                                        }}
                                        onUpdateContent={(content) => updateTag(tag.id, { originalContent: content })}
                                        onDelete={() => setState(prev => ({ ...prev, tags: prev.tags.filter(t => t.id !== tag.id) }))}
                                    />
                                ))}

                                {/* Hook Input Section */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition hover:shadow-lg mt-12 mb-20 p-8 space-y-6">
                                    <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">VIDEO HOOK</span>
                                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Phân tích chuyển động</h2>
                                        </div>
                                        <Video className="w-5 h-5 text-slate-300" />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung đoạn Hook</label>
                                        <textarea
                                            className="w-full h-40 p-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed transition font-medium"
                                            placeholder="Nhập nội dung đoạn Hook kịch bản tại đây..."
                                            value={state.hook}
                                            onChange={(e) => setState(prev => ({ ...prev, hook: e.target.value }))}
                                        />
                                    </div>

                                    {state.hookPrompts.length > 0 && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prompts Video Chuyển Động</label>
                                                <button
                                                    onClick={handleCopyHookPrompts}
                                                    className="flex items-center gap-1.5 text-amber-600 hover:text-amber-700 text-[10px] font-black px-4 py-2 bg-amber-50 rounded-xl transition uppercase tracking-widest shadow-sm shadow-amber-50"
                                                >
                                                    <Copy className="w-3.5 h-3.5" /> Copy Hook Prompts
                                                </button>
                                            </div>
                                            <div className="space-y-4">
                                                {state.hookPrompts.map((prompt, i) => (
                                                    <div key={i} className="p-4 bg-slate-900 rounded-xl border border-slate-800 relative group transition hover:border-amber-500 shadow-lg">
                                                        <div className="absolute -left-3 top-4 w-7 h-7 bg-amber-500 text-white flex items-center justify-center text-[10px] font-black rounded-full border-2 border-slate-50 shadow-md">
                                                            {i + 1}
                                                        </div>
                                                        <p className="text-slate-300 text-[11px] font-mono break-words leading-relaxed pl-4">
                                                            {prompt}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleGenerateHookVideo}
                                        disabled={state.isGeneratingHook || !state.hook}
                                        className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-black py-4.5 rounded-2xl transition shadow-xl shadow-slate-200 uppercase text-xs tracking-[0.2em]"
                                    >
                                        {state.isGeneratingHook ? <Loader2 className="animate-spin w-5 h-5" /> : <Zap className="w-5 h-5 fill-amber-400 text-amber-400" />}
                                        Tạo Prompt Video
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </main>
            </div>
        </ErrorBoundary>
    );
};

interface TagCardProps {
    tag: ScriptTag;
    index: number;
    onSplit: () => void;
    onAnalyze: () => void;
    onGenerate: () => void;
    onUpdateCount: (count: number) => void;
    onCopy: () => void;
    onUpdateContent: (content: string) => void;
    onDelete: () => void;
}

const TagCard: React.FC<TagCardProps> = ({ tag, index, onSplit, onAnalyze, onGenerate, onUpdateCount, onCopy, onUpdateContent, onDelete }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition hover:shadow-lg">
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="bg-slate-800 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">TAG {index + 1}</span>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        {tag.originalContent.length} ký tự
                    </span>
                </div>
                <button onClick={onDelete} className="text-slate-300 hover:text-red-500 transition p-1">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            <div className="p-6 space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kịch bản phân đoạn</label>
                    <div className="relative group">
                        <textarea
                            className="w-full h-40 p-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed transition font-medium"
                            value={tag.status === 'ready' || tag.status === 'generating' ? tag.rows.join('\n') : tag.originalContent}
                            readOnly={tag.status === 'ready' || tag.status === 'generating'}
                            onChange={(e) => onUpdateContent(e.target.value)}
                        />
                        {(tag.status === 'ready' || tag.status === 'generating') && tag.rows.length > 1 && (
                            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-white text-emerald-600 px-3 py-1.5 rounded-lg text-[10px] font-black border border-emerald-100 shadow-sm uppercase">
                                <CheckCircle2 className="w-3 h-3" /> Chia hàng xong
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-6 items-end border-y border-slate-50 py-4">
                    <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Activity className="w-3 h-3" /> Phân tích hành động
                        </label>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onAnalyze}
                                disabled={tag.status === 'analyzing'}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-black rounded-lg transition uppercase tracking-widest"
                            >
                                {tag.status === 'analyzing' ? <Loader2 className="animate-spin w-3 h-3" /> : 'Phân tích'}
                            </button>
                            {tag.actionCount !== undefined && (
                                <div className="flex items-center gap-1.5 text-indigo-600 font-black text-sm">
                                    <span className="text-[10px] text-slate-400 font-bold">Số hành động:</span> {tag.actionCount}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-40 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số lượng ảnh</label>
                        <div className="relative flex items-center">
                            <button
                                onClick={() => onUpdateCount(Math.max(1, tag.imageCount - 1))}
                                className="absolute left-1 w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold"
                            >
                                -
                            </button>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                className="w-full h-10 px-8 text-center border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-700"
                                value={tag.imageCount}
                                onChange={(e) => onUpdateCount(parseInt(e.target.value) || 1)}
                            />
                            <button
                                onClick={() => onUpdateCount(tag.imageCount + 1)}
                                className="absolute right-1 w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={onSplit}
                        disabled={tag.status === 'splitting'}
                        className="h-10 px-6 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition uppercase text-[10px] tracking-widest shadow-sm"
                    >
                        {tag.status === 'splitting' ? <Loader2 className="animate-spin w-3 h-3" /> : <Scissors className="w-3 h-3" />}
                        Chia hàng
                    </button>
                </div>

                {tag.prompts.length > 0 && (
                    <div className="space-y-4 pt-6">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prompts Midjourney</label>
                            <button
                                onClick={onCopy}
                                className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-[10px] font-black px-4 py-2 bg-indigo-50 rounded-xl transition uppercase tracking-widest shadow-sm shadow-indigo-50"
                            >
                                <Copy className="w-3.5 h-3.5" /> Sao chép Tag này
                            </button>
                        </div>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {tag.prompts.map((prompt, i) => (
                                <div key={i} className="p-4 bg-slate-900 rounded-xl border border-slate-800 relative group transition hover:border-indigo-500 shadow-lg">
                                    <div className="absolute -left-3 top-4 w-7 h-7 bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black rounded-full border-2 border-slate-50 shadow-md">
                                        {i + 1}
                                    </div>
                                    <p className="text-slate-300 text-[11px] font-mono break-words leading-relaxed pl-4">
                                        {prompt}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={onGenerate}
                    disabled={tag.status === 'generating'}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-black py-4.5 rounded-2xl transition shadow-xl shadow-indigo-200 uppercase text-xs tracking-[0.2em]"
                >
                    {tag.status === 'generating' ? <Loader2 className="animate-spin w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                    Tạo Prompt Ảnh
                </button>
            </div>
        </div>
    );
};

export default ImageScriptApp;
