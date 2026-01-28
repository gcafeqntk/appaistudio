
import React, { useState, useRef, useEffect, Component, ErrorInfo } from 'react';
import { TargetLanguage, TranslationConfig, SubtitleItem, TranslationState } from '../types';
import { LANGUAGE_OPTIONS, DEFAULT_CONFIGS } from '../constants/translation';
import { parseSRT, generateSRT, downloadAsSrt, cleanText } from '../utils/srt-helper';
import { TranslationService } from '../services/translation_gemini';

// --- Icons (Inline SVGs) ---
const IconZap = ({ className = "w-6 h-6", size = 24 }: { className?: string, size?: number }) => (
    <svg width={size} height={size} className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
);
const IconUpload = ({ className = "w-6 h-6", size = 24 }: { className?: string, size?: number }) => (
    <svg width={size} height={size} className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
);
const IconFileText = ({ className = "w-6 h-6", size = 24 }: { className?: string, size?: number }) => (
    <svg width={size} height={size} className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
);
const IconCheckCircle = ({ className = "w-6 h-6", size = 24 }: { className?: string, size?: number }) => (
    <svg width={size} height={size} className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const IconPlay = ({ className = "w-6 h-6", size = 24 }: { className?: string, size?: number }) => (
    <svg width={size} height={size} className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const IconTrash2 = ({ className = "w-6 h-6", size = 24 }: { className?: string, size?: number }) => (
    <svg width={size} height={size} className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
);
const IconMessageSquare = ({ className = "w-6 h-6", size = 24 }: { className?: string, size?: number }) => (
    <svg width={size} height={size} className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
);
const IconClock = ({ className = "w-6 h-6", size = 24 }: { className?: string, size?: number }) => (
    <svg width={size} height={size} className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const IconSettings = ({ className = "w-6 h-6", size = 24 }: { className?: string, size?: number }) => (
    <svg width={size} height={size} className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
const IconDownload = ({ className = "w-6 h-6", size = 24 }: { className?: string, size?: number }) => (
    <svg width={size} height={size} className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
);
const IconAlertCircle = ({ className = "w-6 h-6", size = 24 }: { className?: string, size?: number }) => (
    <svg width={size} height={size} className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const IconLoader2 = ({ className = "w-6 h-6", size = 24 }: { className?: string, size?: number }) => (
    <svg width={size} height={size} className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
);

import { ErrorBoundary } from '../components/ErrorBoundary';

interface TranslationAppProps {
    userId: string;
}

const TranslationApp: React.FC<TranslationAppProps> = ({ userId }) => {
    const [file, setFile] = useState<File | null>(null);
    const [fileContent, setFileContent] = useState<string>("");
    const [selectedLang, setSelectedLang] = useState<TargetLanguage>('CHINESE');
    const [isConfigMode, setIsConfigMode] = useState(false);
    const [config, setConfig] = useState<TranslationConfig>(DEFAULT_CONFIGS['CHINESE']);
    const [translationState, setTranslationState] = useState<TranslationState>({
        isProcessing: false,
        progress: 0,
        currentBatch: 0,
        totalBatches: 0
    });
    const [apiKey, setApiKey] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load API Key
    useEffect(() => {
        const storedKeys = localStorage.getItem(`app_api_keys_${userId}`);
        if (storedKeys) {
            try {
                const parsed = JSON.parse(storedKeys);
                const decodedGemini = atob(parsed.gemini || '');
                const geminiKeys = decodedGemini.split('\n').map(k => k.trim()).filter(k => k !== '');
                if (geminiKeys.length > 0) {
                    setApiKey(geminiKeys[0]); // Use first key
                }
            } catch (e) {
                console.error("Failed to load keys", e);
            }
        }
    }, [userId]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (uploadedFile) {
            setFile(uploadedFile);
            const reader = new FileReader();
            reader.onload = (ev) => {
                setFileContent(ev.target?.result as string || "");
            };
            reader.readAsText(uploadedFile);
            setTranslationState(prev => ({ ...prev, result: undefined, error: undefined }));
        }
    };

    const handleStartConfig = () => {
        if (!file) return;
        setIsConfigMode(true);
        setConfig(DEFAULT_CONFIGS[selectedLang]);
    };

    const runTranslation = async () => {
        if (!fileContent) return;
        if (!apiKey) {
            setTranslationState(prev => ({
                ...prev,
                isProcessing: false,
                error: "Chưa có API Key. Vui lòng cấu hình ở trang chủ."
            }));
            return;
        }

        const items = parseSRT(fileContent);
        const batchSize = config.batchSize;
        const totalBatches = Math.ceil(items.length / batchSize);

        setTranslationState({
            isProcessing: true,
            progress: 0,
            currentBatch: 0,
            totalBatches: totalBatches,
            error: undefined
        });

        const service = new TranslationService([apiKey]);
        let allTranslatedItems: SubtitleItem[] = [];

        try {
            for (let i = 0; i < totalBatches; i++) {
                const start = i * batchSize;
                const end = Math.min(start + batchSize, items.length);
                const batch = items.slice(start, end);

                setTranslationState(prev => ({
                    ...prev,
                    currentBatch: i + 1,
                    progress: Math.round(((i) / totalBatches) * 100)
                }));

                const translatedBatch = await service.translateBatch(
                    batch,
                    selectedLang,
                    config.customPrompt,
                    config.autoFixFormat
                );

                // Post-processing
                const processedBatch = translatedBatch.map(item => ({
                    ...item,
                    text: config.removeSourceText ? cleanText(item.text, selectedLang) : item.text
                }));

                allTranslatedItems = [...allTranslatedItems, ...processedBatch];

                // Delay logic
                if (i < totalBatches - 1) {
                    await new Promise(resolve => setTimeout(resolve, config.delaySeconds * 1000));
                }
            }

            const finalSRT = generateSRT(allTranslatedItems);
            setTranslationState(prev => ({
                ...prev,
                isProcessing: false,
                progress: 100,
                result: finalSRT
            }));

        } catch (err: any) {
            setTranslationState(prev => ({
                ...prev,
                isProcessing: false,
                error: "Đã xảy ra lỗi trong quá trình dịch: " + (err.message || "Unknown error")
            }));
        }
    };

    if (!apiKey) {
        return (
            <div className="flex flex-col items-center justify-center p-10 h-full">
                <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 text-center shadow-sm">
                    <IconAlertCircle className="w-12 h-12 mx-auto mb-2 text-red-500" />
                    <h3 className="font-bold text-lg mb-2">Chưa cấu hình API Key</h3>
                    <p>Vui lòng nhập Gemini API Key ở phần quản lý Key phía trên trước khi sử dụng ứng dụng này.</p>
                </div>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className="min-h-full p-4 md:p-8 flex flex-col items-center bg-transparent">
                {/* Header */}
                <header className="w-full max-w-4xl text-center mb-12">
                    <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl mb-4 text-white shadow-lg">
                        <IconZap size={32} />
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Dịch Thuật Chuyên Gia</h1>
                    <p className="text-slate-500">Nâng tầm bản dịch phụ đề của bạn với sức mạnh của AI</p>
                </header>

                <main className="w-full max-w-4xl bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    {/* Progress Bar */}
                    {translationState.isProcessing && (
                        <div className="h-1.5 w-full bg-slate-100 relative">
                            <div
                                className="absolute top-0 left-0 h-full bg-indigo-600 transition-all duration-500 ease-out"
                                style={{ width: `${translationState.progress}%` }}
                            />
                        </div>
                    )}

                    <div className="p-8">
                        {/* File Upload Section */}
                        {!isConfigMode && !translationState.isProcessing && !translationState.result && (
                            <div className="space-y-8">
                                <section>
                                    <label className="block text-sm font-semibold text-slate-700 mb-3">Tải lên file nguồn (.srt, .txt)</label>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${file ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'}`}
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            accept=".srt,.txt"
                                            className="hidden"
                                        />
                                        {file ? (
                                            <>
                                                <IconFileText className="text-indigo-600 mb-4 w-12 h-12" size={48} />
                                                <p className="text-indigo-900 font-medium">{file.name}</p>
                                                <p className="text-slate-500 text-sm mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                                            </>
                                        ) : (
                                            <>
                                                <IconUpload className="text-slate-400 mb-4 w-12 h-12" size={48} />
                                                <p className="text-slate-600 font-medium text-lg">Kéo thả hoặc nhấp để chọn file</p>
                                                <p className="text-slate-400 text-sm mt-1">Chỉ hỗ trợ định dạng .srt và .txt</p>
                                            </>
                                        )}
                                    </div>
                                </section>

                                {file && (
                                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <label className="block text-sm font-semibold text-slate-700 mb-3">Chọn ngôn ngữ nguồn</label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {LANGUAGE_OPTIONS.map((lang) => (
                                                <button
                                                    key={lang.id}
                                                    onClick={() => setSelectedLang(lang.id)}
                                                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${selectedLang === lang.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-200'}`}
                                                >
                                                    <span className="text-2xl">{lang.icon}</span>
                                                    <span className="font-semibold">{lang.name}</span>
                                                    {selectedLang === lang.id && <IconCheckCircle size={20} className="ml-auto" />}
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {file && (
                                    <button
                                        onClick={handleStartConfig}
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <IconPlay size={20} />
                                        Bắt đầu thiết lập
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Configuration Mode */}
                        {isConfigMode && !translationState.isProcessing && !translationState.result && (
                            <div className="space-y-8 animate-in zoom-in-95 duration-300">
                                <div className="flex items-center gap-4 mb-2">
                                    <button
                                        onClick={() => setIsConfigMode(false)}
                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                                    >
                                        <IconTrash2 size={20} />
                                    </button>
                                    <h2 className="text-xl font-bold text-slate-800">Cấu hình chuyên gia cho {LANGUAGE_OPTIONS.find(l => l.id === selectedLang)?.name}</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                            <IconMessageSquare size={16} className="text-indigo-500" />
                                            Số phụ đề mỗi gói (Batch Size)
                                        </label>
                                        <input
                                            type="number"
                                            value={config.batchSize}
                                            onChange={(e) => setConfig({ ...config, batchSize: parseInt(e.target.value) || 1 })}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                        <p className="text-xs text-slate-400">Gom nhiều dòng giúp AI hiểu ngữ cảnh tốt hơn và tránh bị ngắt quãng.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                            <IconClock size={16} className="text-indigo-500" />
                                            Thời gian nghỉ (s)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            value={config.delaySeconds}
                                            onChange={(e) => setConfig({ ...config, delaySeconds: parseFloat(e.target.value) || 0.1 })}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                        <p className="text-xs text-slate-400">Thời gian chờ giữa các lần gọi API để tránh bị giới hạn băng thông.</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                        <IconSettings size={16} className="text-indigo-500" />
                                        Kiểm soát chất lượng dịch (Prompt tùy chỉnh)
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={config.customPrompt}
                                        onChange={(e) => setConfig({ ...config, customPrompt: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                        placeholder="Ví dụ: Dịch phong cách kiếm hiệp, xưng hô huynh-đệ..."
                                    />
                                </div>

                                <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Hậu kỳ chuyên sâu</h3>
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={config.removeSourceText}
                                                    onChange={(e) => setConfig({ ...config, removeSourceText: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 transition-all"></div>
                                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 transition-all"></div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-700">Loại bỏ ký tự thừa (Regex)</span>
                                                <span className="text-xs text-slate-400">Tự động xóa các ký tự tượng hình còn sót lại sau khi dịch.</span>
                                            </div>
                                        </label>

                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={config.autoFixFormat}
                                                    onChange={(e) => setConfig({ ...config, autoFixFormat: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 transition-all"></div>
                                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 transition-all"></div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-700">Kiểm tra & Sửa chữa định dạng SRT</span>
                                                <span className="text-xs text-slate-400">Đảm bảo mã thời gian và số thứ tự chuẩn xác 100%.</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <button
                                    onClick={runTranslation}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <IconZap size={20} />
                                    Tiến hành dịch ngay
                                </button>
                            </div>
                        )}

                        {/* Processing Mode */}
                        {translationState.isProcessing && (
                            <div className="py-12 flex flex-col items-center justify-center space-y-6">
                                <div className="relative">
                                    <IconLoader2 size={64} className="text-indigo-600 animate-spin w-16 h-16" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-sm font-bold text-indigo-700">{translationState.progress}%</span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-slate-800">Đang xử lý dữ liệu...</h3>
                                    <p className="text-slate-500 mt-1">Đang dịch gói {translationState.currentBatch} / {translationState.totalBatches}</p>
                                    <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-3 text-amber-800 text-sm max-w-md">
                                        <IconAlertCircle size={18} />
                                        Vui lòng không đóng trình duyệt cho đến khi quá trình hoàn tất.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Result Mode */}
                        {translationState.result && (
                            <div className="py-8 flex flex-col items-center space-y-6 animate-in fade-in duration-500">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
                                    <IconCheckCircle size={40} className="w-10 h-10" />
                                </div>
                                <div className="text-center">
                                    <h2 className="text-2xl font-bold text-slate-800">Dịch thành công!</h2>
                                    <p className="text-slate-500 mt-2">File của bạn đã được tối ưu hóa và sẵn sàng sử dụng.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
                                    <button
                                        onClick={() => downloadAsSrt(file?.name || "translated.srt", translationState.result!)}
                                        className="flex items-center justify-center gap-3 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all"
                                    >
                                        <IconDownload size={20} />
                                        Tải file (.srt)
                                    </button>
                                    <button
                                        onClick={() => {
                                            setFile(null);
                                            setTranslationState({ isProcessing: false, progress: 0, currentBatch: 0, totalBatches: 0 });
                                            setIsConfigMode(false);
                                        }}
                                        className="flex items-center justify-center gap-3 p-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                                    >
                                        <IconTrash2 size={20} />
                                        Dịch file khác
                                    </button>
                                </div>

                                {/* Preview Box */}
                                <div className="w-full mt-6 space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Xem trước nội dung</label>
                                    <div className="w-full h-48 bg-slate-950 rounded-2xl p-4 font-mono text-xs text-slate-300 overflow-y-auto border border-slate-800">
                                        <pre className="whitespace-pre-wrap">{translationState.result.slice(0, 1000)}...</pre>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {translationState.error && (
                            <div className="mt-8 p-6 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-4 text-rose-800">
                                <IconAlertCircle size={24} className="flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold">Lỗi xử lý</h4>
                                    <p className="text-sm mt-1">{translationState.error}</p>
                                    <button
                                        onClick={() => setTranslationState(prev => ({ ...prev, error: undefined }))}
                                        className="mt-3 text-sm font-bold underline hover:no-underline"
                                    >
                                        Thử lại
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* Footer Info */}
                <footer className="mt-12 text-slate-400 text-sm flex flex-col items-center gap-4">
                    <div className="flex items-center gap-6">
                        <span className="flex items-center gap-1"><IconCheckCircle size={14} /> UTF-8 with BOM</span>
                        <span className="flex items-center gap-1"><IconCheckCircle size={14} /> Tối ưu ngữ cảnh</span>
                        <span className="flex items-center gap-1"><IconCheckCircle size={14} /> Tự động sửa lỗi</span>
                    </div>
                    <p>© 2024 Dịch Thuật Chuyên Gia • Bản quyền thuộc về AI Studio</p>
                </footer>
            </div>
        </ErrorBoundary>
    );
};

export default TranslationApp;
