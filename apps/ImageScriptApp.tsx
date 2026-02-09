
import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle, Component, ErrorInfo } from 'react';
import { analyzeImageStyle, analyzeScriptScenes, splitScriptRows, generateImagePrompts, generateVideoPrompts } from '../services/visual_script_gemini';

// --- TYPES ---
interface ScriptTag {
    id: string;
    content: string;
    analysis?: string;
    sceneCount?: number;
    rows?: string[];
    prompts?: string[];
    videoPrompts?: string[];
}

interface TagItemRef {
    runAutoSequence: () => Promise<void>;
    getRows: () => string[];
    getPrompts: () => string[];
    getVideoPrompts: () => string[];
}

import { ErrorBoundary } from '../components/ErrorBoundary';

// --- SUB-COMPONENT: TagItem ---
const TagItem = forwardRef<TagItemRef, { tag: ScriptTag; style: string; index: number; apiKey?: string; onNotify: (msg: string, type: 'success' | 'error' | 'info') => void }>(({ tag, style, index, apiKey, onNotify }, ref) => {
    const [localTag, setLocalTag] = useState<ScriptTag>(tag);
    // Use ref to keep track of latest state for imperative handle
    const localTagRef = useRef(localTag);

    useEffect(() => {
        localTagRef.current = localTag;
    }, [localTag]);
    const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const handleAnalyze = async () => {
        setIsLoading(prev => ({ ...prev, analyze: true }));
        try {
            const result = await analyzeScriptScenes(localTag.content, apiKey);
            setLocalTag(prev => ({
                ...prev,
                analysis: result.breakdown,
                sceneCount: result.count
            }));
            return result;
        } catch (err) {
            console.error(err);
            onNotify("Lỗi khi phân tích phân cảnh", 'error');
            throw err;
        } finally {
            setIsLoading(prev => ({ ...prev, analyze: false }));
        }
    };

    const handleSplitRows = async (analysis?: string, count?: number) => {
        const targetAnalysis = analysis || localTag.analysis;
        const targetCount = count || localTag.sceneCount;

        if (!targetAnalysis || !targetCount) {
            onNotify("Cần phân tích phân cảnh trước", 'info');
            return;
        }
        setIsLoading(prev => ({ ...prev, split: true }));
        try {
            const rows = await splitScriptRows(localTag.content, targetAnalysis, targetCount, apiKey);
            setLocalTag(prev => ({ ...prev, rows }));
            return rows;
        } catch (err) {
            console.error(err);
            onNotify("Lỗi khi chia hàng", 'error');
            throw err;
        } finally {
            setIsLoading(prev => ({ ...prev, split: false }));
        }
    };

    const handleGeneratePrompts = async (rowsData?: string[]) => {
        const targetRows = rowsData || localTag.rows;
        if (!targetRows || targetRows.length === 0) {
            onNotify("Cần chia hàng trước", 'info');
            return;
        }
        setIsLoading(prev => ({ ...prev, prompt: true }));
        try {
            const prompts = await generateImagePrompts(targetRows, style, apiKey);
            setLocalTag(prev => ({ ...prev, prompts }));
            return prompts;
        } catch (err) {
            console.error(err);
            onNotify("Lỗi khi tạo prompt", 'error');
            throw err;
        } finally {
            setIsLoading(prev => ({ ...prev, prompt: false }));
        }
    };

    const handleGenerateVideoPrompts = async () => {
        if (!localTag.rows || localTag.rows.length === 0) {
            onNotify("Cần chia hàng trước", 'info');
            return;
        }
        if (!localTag.analysis) {
            onNotify("Cần phân tích phân cảnh trước", 'info');
            return;
        }
        setIsLoading(prev => ({ ...prev, videoPrompt: true }));
        try {
            const videoPrompts = await generateVideoPrompts(localTag.rows, style, localTag.analysis, apiKey);
            setLocalTag(prev => ({ ...prev, videoPrompts }));
            return videoPrompts;
        } catch (err) {
            console.error(err);
            onNotify("Lỗi khi tạo prompt video", 'error');
        } finally {
            setIsLoading(prev => ({ ...prev, videoPrompt: false }));
        }
    };

    const copyAllFormatted = (items: string[]) => {
        if (!items || items.length === 0) return;
        const textToCopy = items
            .map(item => item.trim())
            .filter(item => item.length > 0)
            .map(item => item.replace(/\r?\n|\r/g, " "))
            .map(item => item.replace(/^["']+|["']+$/g, ''))
            .join('\n');

        navigator.clipboard.writeText(textToCopy);
        onNotify("Đã sao chép nội dung chính xác theo từng hàng!", 'success');
    };

    useImperativeHandle(ref, () => ({
        runAutoSequence: async () => {
            // Use local references or pass data explicitly to avoid stale closures
            const analysisResult = await handleAnalyze();
            await delay(5000); // Reduced delay for better UX (optional, can keep 15s if needed)
            const rowsResult = await handleSplitRows(analysisResult.breakdown, analysisResult.count);
            await delay(5000);
            const promptsResult = await handleGeneratePrompts(rowsResult);
            // Ensure state is fully committed before next step
        },
        getRows: () => localTagRef.current.rows || [],
        getPrompts: () => localTagRef.current.prompts || [],
        getVideoPrompts: () => localTagRef.current.videoPrompts || []
    }), []); // Empty dependency array ensures handle remains stable

    return (
        <div className={`bg-white rounded-2xl shadow-sm border p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 transition-colors ${Object.values(isLoading).some(v => v) ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">TAG {index + 1}</span>
                    Phần kịch bản
                </h3>
                {localTag.sceneCount !== undefined && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                        {localTag.sceneCount} Phân đoạn
                    </span>
                )}
            </div>

            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nội dung kịch bản</label>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-700 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {localTag.content}
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button
                        onClick={() => handleAnalyze()}
                        disabled={isLoading.analyze}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${isLoading.analyze ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-95'}`}
                    >
                        {isLoading.analyze ? '...' : 'Phân Tích'}
                    </button>
                    <button
                        onClick={() => handleSplitRows()}
                        disabled={isLoading.split || !localTag.analysis}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${isLoading.split || !localTag.analysis ? 'bg-gray-100 text-gray-400' : 'bg-teal-50 text-teal-700 hover:bg-teal-100 active:scale-95'}`}
                    >
                        {isLoading.split ? '...' : 'Chia hàng'}
                    </button>
                    <button
                        onClick={() => handleGeneratePrompts()}
                        disabled={isLoading.prompt || !localTag.rows}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${isLoading.prompt || !localTag.rows ? 'bg-gray-100 text-gray-400' : 'bg-purple-50 text-purple-700 hover:bg-purple-100 active:scale-95'}`}
                    >
                        {isLoading.prompt ? '...' : 'Prompt Ảnh'}
                    </button>
                    <button
                        onClick={() => handleGenerateVideoPrompts()}
                        disabled={isLoading.videoPrompt || !localTag.rows}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${isLoading.videoPrompt || !localTag.rows ? 'bg-gray-100 text-gray-400' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 active:scale-95'}`}
                    >
                        {isLoading.videoPrompt ? '...' : 'Prompt Video'}
                    </button>
                </div>

                {localTag.analysis && (
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2">
                        <h4 className="text-xs font-bold text-indigo-700 uppercase">Phân tích phân cảnh</h4>
                        <p className="text-sm text-indigo-900 leading-relaxed whitespace-pre-wrap">{localTag.analysis}</p>
                    </div>
                )}

                {localTag.rows && localTag.rows.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kịch bản đã chia hàng ({localTag.rows.length})</h4>
                            <button
                                onClick={() => copyAllFormatted(localTag.rows || [])}
                                className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 uppercase flex items-center gap-1"
                            >
                                Copy All
                            </button>
                        </div>
                        <div className="space-y-2">
                            {localTag.rows.map((row, idx) => (
                                <div key={idx} className="p-3 bg-white border border-gray-100 rounded-lg text-sm flex gap-3">
                                    <span className="text-indigo-300 font-mono text-xs">{idx + 1}</span>
                                    <span className="text-gray-700 italic">"{row}"</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {localTag.prompts && localTag.prompts.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-gray-50">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider">Image Prompts</h4>
                            <button
                                onClick={() => copyAllFormatted(localTag.prompts || [])}
                                className="text-[10px] font-bold text-purple-500 hover:text-purple-700 uppercase flex items-center gap-1"
                            >
                                Copy All
                            </button>
                        </div>
                        <div className="space-y-3">
                            {localTag.prompts.map((prompt, idx) => (
                                <div key={idx} className="p-4 bg-purple-50 border border-purple-100 rounded-xl text-sm font-mono text-purple-900 leading-relaxed">
                                    <div className="text-[10px] font-bold text-purple-400 mb-1">PROMPT #{idx + 1}</div>
                                    {prompt}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {localTag.videoPrompts && localTag.videoPrompts.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-gray-50">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider">Video Prompts</h4>
                            <button
                                onClick={() => copyAllFormatted(localTag.videoPrompts || [])}
                                className="text-[10px] font-bold text-rose-500 hover:text-rose-700 uppercase flex items-center gap-1"
                            >
                                Copy All
                            </button>
                        </div>
                        <div className="space-y-3">
                            {localTag.videoPrompts.map((prompt, idx) => (
                                <div key={idx} className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-sm font-mono text-rose-900 leading-relaxed">
                                    <div className="text-[10px] font-bold text-rose-400 mb-1">VIDEO PROMPT #{idx + 1}</div>
                                    {prompt}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

// --- SUB-COMPONENT: Sidebar ---
interface SidebarProps {
    onStyleChange: (style: string) => void;
    onSplitScript: (script: string) => void;
    apiKey?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ onStyleChange, onSplitScript, apiKey }) => {
    const [image, setImage] = useState<string | null>(null);
    const [styleDesc, setStyleDesc] = useState('');
    const [scriptInput, setScriptInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            setImage(reader.result as string);
            setIsAnalyzing(true);
            try {
                const result = await analyzeImageStyle(base64, apiKey);
                setStyleDesc(result);
                onStyleChange(result);
            } catch (err) {
                console.error(err);
                alert("Lỗi khi phân tích ảnh: " + (err instanceof Error ? err.message : String(err)));
            } finally {
                setIsAnalyzing(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const splitLogic = () => {
        if (!scriptInput.trim()) return;
        onSplitScript(scriptInput);
    };

    return (
        <div className="flex flex-col h-full space-y-6 p-6 border-r border-gray-200 bg-white">
            <div className="space-y-2">
                <h2 className="text-xl font-bold text-indigo-700">HOT AI Visual Director</h2>
                <p className="text-xs text-gray-500 italic">Professional image direction & analysis</p>
            </div>

            {/* Image Upload Section */}
            <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">Tải ảnh phong cách</label>
                <div className="relative group">
                    <div className={`border-2 border-dashed rounded-xl p-4 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer ${image ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-500 hover:bg-gray-50'}`}>
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleImageUpload}
                            accept="image/*"
                        />
                        {image ? (
                            <img src={image} alt="Reference" className="w-full h-32 object-cover rounded-lg shadow-sm" />
                        ) : (
                            <div className="text-center">
                                <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="mt-2 block text-xs font-medium text-gray-600">Click hoặc kéo thả ảnh vào đây</span>
                            </div>
                        )}
                    </div>
                    {isAnalyzing && (
                        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center rounded-xl">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    )}
                </div>
            </div>

            {/* Style Output */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Phong cách phân tích</label>
                <textarea
                    value={styleDesc}
                    onChange={(e) => {
                        setStyleDesc(e.target.value);
                        onStyleChange(e.target.value);
                    }}
                    className="w-full h-32 p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-gray-50"
                    placeholder="Đặc điểm phong cách sẽ hiện ở đây..."
                />
            </div>

            {/* Script Input Area */}
            <div className="flex-grow flex flex-col space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Nhập kịch bản</label>
                <textarea
                    value={scriptInput}
                    onChange={(e) => setScriptInput(e.target.value)}
                    className="flex-grow w-full p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    placeholder="Dán kịch bản của bạn vào đây..."
                />
            </div>

            {/* Action Button */}
            <button
                onClick={splitLogic}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transform transition-all active:scale-95 focus:outline-none focus:ring-4 focus:ring-indigo-200"
            >
                Chia Kịch Bản
            </button>

            <div className="text-[10px] text-gray-400 text-center uppercase tracking-widest">
                © 2024 HOT AI Studio
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: TagList ---
const TagList: React.FC<{ tags: ScriptTag[]; style: string; apiKey?: string; onNotify: (msg: string, type: 'success' | 'error' | 'info') => void }> = ({ tags, style, apiKey, onNotify }) => {
    const tagRefs = useRef<(TagItemRef | null)[]>([]);
    const [isAutoProcessing, setIsAutoProcessing] = useState(false);
    const [autoStatus, setAutoStatus] = useState<string>("");

    const handleAutoAll = async () => {
        if (tags.length === 0) return;
        setIsAutoProcessing(true);
        setAutoStatus("Đang xử lý...");
        try {
            for (let i = 0; i < tagRefs.current.length; i++) {
                const ref = tagRefs.current[i];
                if (ref) {
                    setAutoStatus(`Đang xử lý Tag ${i + 1}/${tags.length}...`);
                    console.log(`Auto processing tag ${i + 1}/${tags.length}...`);
                    await ref.runAutoSequence();
                }
            }
            setAutoStatus("Hoàn tất!");
            // Remove blocking alert that causes white screen issues
            // alert("Đã hoàn tất tự động hóa cho tất cả các TAG!");
        } catch (err) {
            console.error(err);
            setAutoStatus("Có lỗi xảy ra!");
            onNotify("Quá trình tự động bị gián đoạn do lỗi.", 'error');
        } finally {
            setIsAutoProcessing(false);
            setTimeout(() => setAutoStatus(""), 5000);
        }
    };

    const handleCopyAllScripts = () => {
        const allRows: string[] = [];
        tagRefs.current.forEach(ref => {
            if (ref) {
                const rows = ref.getRows();
                const cleanedRows = rows
                    .map(r => r.trim())
                    .filter(r => r.length > 0)
                    .map(r => r.replace(/\r?\n|\r/g, " "))
                    .map(r => r.replace(/^["']+|["']+$/g, ''));
                allRows.push(...cleanedRows);
            }
        });

        if (allRows.length === 0) {
            onNotify("Không có kịch bản đã chia hàng để copy!", 'info');
            return;
        }

        navigator.clipboard.writeText(allRows.join('\n'));
        onNotify(`Đã copy chính xác ${allRows.length} hàng kịch bản!`, 'success');
    };

    const handleCopyAllPrompts = () => {
        const allPrompts: string[] = [];
        tagRefs.current.forEach(ref => {
            if (ref) {
                const prompts = ref.getPrompts();
                const cleanedPrompts = prompts
                    .map(p => p.trim())
                    .filter(p => p.length > 0)
                    .map(p => p.replace(/\r?\n|\r/g, " "))
                    .map(p => p.replace(/^["']+|["']+$/g, ''));
                allPrompts.push(...cleanedPrompts);
            }
        });

        if (allPrompts.length === 0) {
            onNotify("Không có prompt để copy!", 'info');
            return;
        }

        navigator.clipboard.writeText(allPrompts.join('\n'));
        onNotify(`Đã copy chính xác ${allPrompts.length} prompt!`, 'success');
    };

    const handleCopyAllVideoPrompts = () => {
        const allVideoPrompts: string[] = [];
        tagRefs.current.forEach(ref => {
            if (ref) {
                const vPrompts = ref.getVideoPrompts();
                const cleanedVideoPrompts = vPrompts
                    .map(p => p.trim())
                    .filter(p => p.length > 0)
                    .map(p => p.replace(/\r?\n|\r/g, " "))
                    .map(p => p.replace(/^["']+|["']+$/g, ''));
                allVideoPrompts.push(...cleanedVideoPrompts);
            }
        });

        if (allVideoPrompts.length === 0) {
            onNotify("Không có prompt video để copy!", 'info');
            return;
        }

        navigator.clipboard.writeText(allVideoPrompts.join('\n'));
        onNotify(`Đã copy chính xác ${allVideoPrompts.length} prompt video!`, 'success');
    };

    if (tags.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 p-12 bg-white rounded-3xl border border-gray-100 border-dashed">
                <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="text-lg font-medium">Chưa có kịch bản được chia</p>
                <p className="text-sm">Vui lòng nhập kịch bản và nhấn "Chia Kịch Bản" ở cột trái</p>
            </div>
        );
    }

    // Reset refs when tags change
    if (tagRefs.current.length !== tags.length) {
        tagRefs.current = new Array(tags.length).fill(null);
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Global Toolbar */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-100 rounded-2xl sticky top-4 z-10 shadow-sm border border-gray-200">
                <button
                    onClick={handleAutoAll}
                    disabled={isAutoProcessing}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${isAutoProcessing ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md active:scale-95'}`}
                >
                    {isAutoProcessing ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Đang Tự Động...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Tự Động Hoàn Toàn
                        </>
                    )}
                </button>

                <button
                    onClick={handleCopyAllScripts}
                    className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm active:scale-95 flex items-center gap-2"
                >
                    <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    Copy All Kịch Bản
                </button>

                <button
                    onClick={handleCopyAllPrompts}
                    className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm active:scale-95 flex items-center gap-2"
                >
                    <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Copy All Prompt Anh
                </button>

                <button
                    onClick={handleCopyAllVideoPrompts}
                    className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm active:scale-95 flex items-center gap-2"
                >
                    <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.586-4.586a2 2 0 012.828 0L24 10m-2-2l1.586-1.586a2 2 0 012.828 0L28 8m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Copy All Video
                </button>
            </div>

            {autoStatus && (
                <div className={`mx-4 mt-2 p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${autoStatus === 'Có lỗi xảy ra!' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                    {autoStatus === 'Hoàn tất!' ? (
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"></div>
                    )}
                    {autoStatus}
                </div>
            )}

            <div className="flex items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Bảng Điều Khiển Tags</h2>
                <div className="h-px flex-grow bg-gray-100"></div>
                <span className="text-sm font-medium text-gray-400">{tags.length} TAGS SẴN SÀNG</span>
            </div>

            <div className="space-y-8">
                {tags.map((tag, idx) => (
                    <TagItem
                        key={tag.id}
                        tag={tag}
                        style={style}
                        index={idx}
                        apiKey={apiKey}
                        ref={el => { tagRefs.current[idx] = el; }}
                        onNotify={onNotify}
                    />
                ))}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT: ImageScriptApp ---
interface ImageScriptAppProps {
    userId?: string;
}

const ImageScriptApp: React.FC<ImageScriptAppProps> = ({ userId }) => {
    const [currentStyle, setCurrentStyle] = useState<string>('');
    const [tags, setTags] = useState<ScriptTag[]>([]);
    const [apiKey, setApiKey] = useState('');

    // Notification State
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    // Pass showNotification to children via props or context?
    // Since everything is in one file, we can pass it down.


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

    const splitScript = useCallback((fullScript: string) => {
        // Determine language-based split logic
        const isJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(fullScript);

        let chunks: string[] = [];

        if (isJapanese) {
            // 2000 chars per tag for Japanese
            for (let i = 0; i < fullScript.length; i += 2000) {
                chunks.push(fullScript.substring(i, i + 2000));
            }
        } else {
            // 1400 words per tag for Vietnamese/English (approx 1300-1500)
            const words = fullScript.split(/\s+/);
            const wordsPerChunk = 1400;
            for (let i = 0; i < words.length; i += wordsPerChunk) {
                chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
            }
        }

        const newTags: ScriptTag[] = chunks.map((chunk, index) => ({
            id: crypto.randomUUID(),
            content: chunk,
        }));

        setTags(newTags);
    }, []);

    const handleStyleChange = (style: string) => {
        setCurrentStyle(style);
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-gray-50">
            {/* Left Column (30%) */}
            <aside className="w-[30%] min-w-[320px] max-w-[450px] flex-shrink-0 h-full">
                <Sidebar onStyleChange={handleStyleChange} onSplitScript={splitScript} apiKey={apiKey} />
            </aside>

            {/* Right Column (70%) */}
            <main className="flex-grow h-full overflow-y-auto p-8 lg:p-12 scroll-smooth">
                <div className="max-w-4xl mx-auto">
                    <header className="mb-12">
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                            HOT <span className="text-indigo-600">AI</span>
                        </h1>
                        <p className="mt-2 text-gray-500 font-medium">Hệ thống sản xuất Visual Prompts chuyên nghiệp</p>
                    </header>

                    <ErrorBoundary>
                        <div className="relative">
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
                            <TagList
                                tags={tags}
                                style={currentStyle}
                                apiKey={apiKey}
                                onNotify={showNotification}
                            />
                        </div>
                    </ErrorBoundary>
                </div>
            </main>
        </div>
    );
};

export default ImageScriptApp;
