
import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { ScriptTag } from '../../../types';
import { analyzeScriptScenes, splitScriptRows, generateImagePrompts, generateVideoPrompts } from '../../../services/visual_script_gemini';

interface TagItemProps {
    tag: ScriptTag;
    style: string;
    index: number;
    apiKey: string;
}

export interface TagItemRef {
    runAutoSequence: () => Promise<void>;
    getRows: () => string[];
    getPrompts: () => string[];
}

const TagItem = forwardRef<TagItemRef, TagItemProps>(({ tag, style, index, apiKey }, ref) => {
    const [localTag, setLocalTag] = useState<ScriptTag>(tag);
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
            alert("Lỗi khi phân tích phân cảnh");
            throw err;
        } finally {
            setIsLoading(prev => ({ ...prev, analyze: false }));
        }
    };

    const handleSplitRows = async (analysis?: string, count?: number) => {
        const targetAnalysis = analysis || localTag.analysis;
        const targetCount = count || localTag.sceneCount;

        if (!targetAnalysis || !targetCount) {
            alert("Cần phân tích phân cảnh trước");
            return;
        }
        setIsLoading(prev => ({ ...prev, split: true }));
        try {
            const rows = await splitScriptRows(localTag.content, targetAnalysis, targetCount, apiKey);
            setLocalTag(prev => ({ ...prev, rows }));
            return rows;
        } catch (err) {
            console.error(err);
            alert("Lỗi khi chia hàng");
            throw err;
        } finally {
            setIsLoading(prev => ({ ...prev, split: false }));
        }
    };

    const handleGeneratePrompts = async (rowsData?: string[]) => {
        const targetRows = rowsData || localTag.rows;
        if (!targetRows || targetRows.length === 0) {
            alert("Cần chia hàng trước");
            return;
        }
        setIsLoading(prev => ({ ...prev, prompt: true }));
        try {
            const prompts = await generateImagePrompts(localTag.rows, style, apiKey);
            setLocalTag(prev => ({ ...prev, prompts }));
            return prompts;
        } catch (err) {
            console.error(err);
            alert("Lỗi khi tạo prompt");
            throw err;
        } finally {
            setIsLoading(prev => ({ ...prev, prompt: false }));
        }
    };

    const handleGenerateVideoPrompts = async () => {
        if (!localTag.rows || localTag.rows.length === 0) {
            alert("Cần chia hàng trước");
            return;
        }
        setIsLoading(prev => ({ ...prev, videoPrompt: true }));
        try {
            const videoPrompts = await generateVideoPrompts(localTag.rows, localTag.prompts || [], apiKey);
            setLocalTag(prev => ({ ...prev, videoPrompts }));
        } catch (err) {
            console.error(err);
            alert("Lỗi khi tạo prompt video");
        } finally {
            setIsLoading(prev => ({ ...prev, videoPrompt: false }));
        }
    };

    const copyAllFormatted = (items: string[]) => {
        if (!items || items.length === 0) return;
        const textToCopy = items
            .map(item => item.trim())
            .filter(item => item.length > 0)
            // Loại bỏ hoàn toàn dấu xuống dòng bên trong một hàng để đảm bảo 1 hàng kịch bản = 1 dòng văn bản
            .map(item => item.replace(/\r?\n|\r/g, " "))
            // Loại bỏ dấu ngoặc kép ở đầu và cuối
            .map(item => item.replace(/^["']+|["']+$/g, ''))
            .join('\n');

        navigator.clipboard.writeText(textToCopy);
        alert("Đã sao chép nội dung chính xác theo từng hàng!");
    };

    useImperativeHandle(ref, () => ({
        runAutoSequence: async () => {
            const analysisResult = await handleAnalyze();
            await delay(10000);
            const rowsResult = await handleSplitRows(analysisResult.breakdown, analysisResult.count);
            await delay(10000);
            await handleGeneratePrompts(rowsResult);
            await delay(10000);
        },
        getRows: () => localTag.rows || [],
        getPrompts: () => localTag.prompts || []
    }));

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
                        onClick={handleGenerateVideoPrompts}
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
            </div>
        </div>
    );
});

export default TagItem;
