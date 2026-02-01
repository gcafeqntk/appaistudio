import React, { useState, useEffect, useRef } from 'react';
import { Upload, Sparkles, Loader2, Image as ImageIcon, FileText, Type, Save, CheckCircle2, Copy, Users, Shuffle, Download, Maximize2, X } from 'lucide-react';
import { analyzeImageStyle, generateViralTitle, generateDescriptionAndHashtags, generateThumbnailLayout } from '../services/gemini';

interface ThumbHuyAppProps {
    userId: string;
}

const ThumbHuyApp: React.FC<ThumbHuyAppProps> = ({ userId }) => {
    // --- STATE ---

    // 1. Upload & Analyze
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<string>("");

    // 2. Script & Content
    const [script, setScript] = useState("");
    const [title, setTitle] = useState("");
    const [isTitleSaved, setIsTitleSaved] = useState(false);
    const [descriptionData, setDescriptionData] = useState<{ text: string, hashtags: string[] } | null>(null);

    // 3. API Configuration (Read from appaistudio's ApiKeyManager)
    const [apiKey, setApiKey] = useState("");

    // 4. Thumbnail Studio (New)

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [characterImage, setCharacterImage] = useState<string | null>(null);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null); // Background URL from AI
    const [splitTitle, setSplitTitle] = useState<string[]>([]);
    const [designSeed, setDesignSeed] = useState(0); // For Random button
    const [finalThumbnail, setFinalThumbnail] = useState<string | null>(null);
    const [showZoom, setShowZoom] = useState(false);

    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [isFullScreen, setIsFullScreen] = useState(false); // New Toggle State

    // --- EFFECTS ---

    // Load API keys from appaistudio's storage format
    useEffect(() => {
        const storageKey = `app_api_keys_${userId}`;
        const savedKeys = localStorage.getItem(storageKey);
        if (savedKeys) {
            try {
                const parsed = JSON.parse(savedKeys);
                const decode = (str: string) => { try { return atob(str); } catch (e) { return str; } };
                const geminiKeys = decode(parsed.gemini || '');
                setApiKey(geminiKeys);
            } catch (e) {
                console.error("Failed to parse API keys", e);
            }
        }
    }, [userId]);

    // [REMOVED DUPLICATE RENDER EFFECT]



    // --- HANDLERS ---



    const handleStyleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const previewReader = new FileReader();
        previewReader.onload = (e) => setUploadedImage(e.target?.result as string);
        previewReader.readAsDataURL(file);

        setIsAnalyzing(true);
        try {
            const getBase64 = (file: File): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => {
                        const result = reader.result as string;
                        const base64 = result.split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = error => reject(error);
                });
            };
            const base64data = await getBase64(file);
            const styleDescription = await analyzeImageStyle(base64data, apiKey || undefined);
            setAnalysis(styleDescription);
        } catch (error: any) {
            console.error("Analysis failed:", error);
            if (error.message?.includes('429')) {
                setAnalysis("⚠️ Lỗi: Hết lượt sử dụng miễn phí (Quota Exceeded). Vui lòng nhập API Key vào API Configuration Manager.");
            } else {
                setAnalysis("Lỗi phân tích: " + error.message);
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGenerateTitle = async () => {
        if (!script.trim()) return alert("Vui lòng nhập kịch bản trước!");
        setLoadingAction("title");
        try {
            const viralTitle = await generateViralTitle(script, apiKey || undefined);
            setTitle(viralTitle);
            setIsTitleSaved(false);
        } catch (error: any) {
            if (error.message?.includes('429')) {
                alert("⚠️ Hết lượt Free. Vui lòng nhập API Key vào API Configuration Manager.");
            } else {
                alert("Lỗi: " + error.message);
            }
        } finally {
            setLoadingAction(null);
        }
    };

    const handleGenerateDescription = async () => {
        if (!script.trim()) return alert("Vui lòng nhập kịch bản trước!");
        setLoadingAction("desc");
        try {
            const inputTitle = isTitleSaved ? title : title;
            const result = await generateDescriptionAndHashtags(script, inputTitle, apiKey || undefined);
            setDescriptionData(result);
        } catch (error: any) {
            if (error.message?.includes('429')) {
                alert("⚠️ Hết lượt Free. Vui lòng nhập API Key vào API Configuration Manager.");
            } else {
                alert("Lỗi: " + error.message);
            }
        } finally {
            setLoadingAction(null);
        }
    };

    const handleCharacterUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setCharacterImage(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleCreateThumbnail = async () => {
        const currentTitle = isTitleSaved ? title : title;
        if (!script.trim() && !currentTitle) return alert("Cần có kịch bản hoặc tiêu đề để tạo!");

        setLoadingAction('thumb');
        setThumbnailUrl(null); // Reset

        try {
            // 1. Get Layout & Prompts
            const keys = apiKey ? apiKey : undefined;

            // AGGRESSIVE FIX: Track Style Source
            let styleContext = "Cinematic, Dramatic Lighting, YouTube Viral, Hyper-realistic, 8k resolution";
            let styleSource = "DEFAULT (No Analysis)";

            if (analysis && analysis.length > 20) {
                styleContext = analysis;
                styleSource = "✅ USER UPLOADED STYLE";
            }

            console.log(`%c[STYLE SOURCE]: ${styleSource}`, "color: yellow; font-weight: bold; font-size: 14px");
            console.log(`[STYLE CONTEXT]: ${styleContext.substring(0, 100)}...`);

            const layout = await generateThumbnailLayout(script || "No script", currentTitle || "No Title", styleContext, keys);

            console.log("Layout:", layout);
            setSplitTitle(layout.lines);

            // 2. background logic - ENHANCED MODE
            // Logic: Always in NV mode now, so if user has a character image, don't generate AI background
            if (characterImage) {
                console.log("NV Mode with User Image: Skipping AI Background generation.");
                setThumbnailUrl(null); // Ensure no global background overrides it
            } else {
                // ... Existing AI Generation Logic ...
                const seed = Math.floor(Math.random() * 1000000); // Increased range

                // STRICT SANITIZATION: Relaxed to allow more expression
                let safePrompt = layout.backgroundPrompt
                    .replace(/[^a-zA-Z0-9 ,.\-_'"()]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                // AGGRESSIVE FIX: Force cache bust by adding seed to PROMPT TEXT
                safePrompt += ` --v ${seed}`;

                console.log("%c PROMPT: " + safePrompt, "background: red; color: white; font-size: 20px");

                // Fallback if prompt is too weak (e.g. AI returned empty)
                if (!safePrompt || safePrompt.length < 10) {
                    safePrompt = `${currentTitle}, cinematic, youtube thumbnail background --v ${seed}`;
                }

                // RESTORING AI GENERATION (KEYWORD FORMULA)
                // Using 'turbo' model + Negative Prompts + Keyword-only Prompt

                // FIXED: Define finalPrompt
                const finalPrompt = encodeURIComponent(safePrompt);

                // DIAGNOSTIC "BARE MINIMUM"
                // Minimal parameters to reduce rejection chance. Removed model, seed, negative.
                const bgUrl = `https://image.pollinations.ai/prompt/${finalPrompt}?width=1280&height=720&nologo=true`;

                console.log("%c FINAL URL: " + bgUrl, "background: blue; color: white");
                console.log("Using Style Source:", styleSource);

                setThumbnailUrl(bgUrl);

                // Alert for User Confirmation (Temporary aggressive feedback)
                // alert(`Style Used: ${styleSource}\nPrompt Generated!\nCheck bottom of screen for Prompt text.`);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Lỗi: " + error);
        } finally {
            setLoadingAction(null);
        }
    };

    const downloadThumbnail = () => {
        if (finalThumbnail) {
            const link = document.createElement('a');
            link.href = finalThumbnail;
            link.download = `thumbnail_${Date.now()}.jpg`;
            link.click();
        }
        if (canvasRef.current) {
            try {
                // Try clean download
                const link = document.createElement('a');
                link.href = canvasRef.current.toDataURL('image/jpeg', 0.9);
                link.download = `thumbnail_${Date.now()}.jpg`;
                link.click();
            } catch (e) {
                alert("Không thể tải ảnh nền do lỗi bảo mật trình duyệt (CORS). Hãy chụp màn hình!");
            }
        }
    };

    // Canvas Rendering System
    useEffect(() => {
        if (!canvasRef.current) return;

        const render = async () => {
            const canvas = canvasRef.current!;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // HELPERS
            const loadImage = (src: string): Promise<HTMLImageElement | null> => {
                return new Promise(resolve => {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.src = src;
                    img.onload = () => resolve(img);
                    img.onerror = () => resolve(null);
                });
            };

            // 1. Clear Canvas (Transparent)
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 2. Draw Main Background Visuals 
            // Priority: User Image (in NV mode) > AI Background (thumbnailUrl)

            let isUserBackground = false;

            // Scenario A: User uploaded Character Image (always in NV mode now)
            if (characterImage) {
                const charImg = await loadImage(characterImage);
                if (charImg) {
                    const imgRatio = charImg.width / charImg.height;

                    // LOGIC: Use Full Screen if Image is Wide (>1.2) AND Toggle is ON
                    // Otherwise: Use Smart Composition (Blur + Overlay)
                    const useFullScreen = (imgRatio > 1.2) && isFullScreen;

                    if (useFullScreen) {
                        const scale = Math.max(canvas.width / charImg.width, canvas.height / charImg.height);
                        const x = (canvas.width - charImg.width * scale) / 2;
                        const y = (canvas.height - charImg.height * scale) / 2;

                        // Draw FULL SCREEN SHARP
                        ctx.drawImage(charImg, x, y, charImg.width * scale, charImg.height * scale);

                        isUserBackground = true;
                    }
                    // CASE 2: Portrait OR User wants to "Focus Character" (Full Screen OFF)
                    // ACTION: Smart Composition (Blurred BG + Right Overlay)
                    else {
                        // 1. Draw Background Layer (Blurred/Darkened fill)
                        // Always fill screen to avoid black bars
                        const scaleBg = Math.max(canvas.width / charImg.width, canvas.height / charImg.height);
                        const xBg = (canvas.width - charImg.width * scaleBg) / 2;
                        const yBg = (canvas.height - charImg.height * scaleBg) / 2;

                        ctx.save();
                        ctx.filter = 'blur(20px) brightness(0.5)';
                        ctx.drawImage(charImg, xBg, yBg, charImg.width * scaleBg, charImg.height * scaleBg);
                        ctx.restore();

                        // 2. Decide Foreground Logic based on Image Type
                        // IF it is a WIDE image (16:9) and we are here (Unchecked), user wants "Smart Shift".
                        if (imgRatio > 1.2) {
                            // Render Sharp Image SHIFTED RIGHT.
                            // We want center of image (0.5w) to align with center of Right Zone (0.85 screen).
                            // Current X center = scaleBg * charImg.width / 2.
                            // Target X center = canvas.width * 0.85
                            // Shift Amount = Target - Current.

                            // Let's just draw the full image again, but shifted.
                            const imgW = charImg.width * scaleBg;
                            const imgH = charImg.height * scaleBg;

                            // Calculate X to put center of image at 85% of screen
                            const targetCenterX = canvas.width * 0.85;
                            const currentCenterX = imgW / 2;
                            const xShift = targetCenterX - currentCenterX;

                            // To prevent hard edge on left, use a Gradient Mask
                            ctx.save();

                            // Create Gradient Mask
                            // We want Left (Text area) to be Transparent (showing blurred bg).
                            // We want Right (Character) to be Opaque.
                            // Gradient from 50% screen to 70% screen.
                            const maskGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
                            maskGrad.addColorStop(0, "rgba(0,0,0,0)");
                            maskGrad.addColorStop(0.5, "rgba(0,0,0,0)"); // Transparent until middle
                            maskGrad.addColorStop(0.8, "rgba(0,0,0,1)"); // Fully Visible at Right Zone

                            // Note: In globalCompositeOperation 'source-over', gradient alpha controls nothing if we just draw rect.
                            // We need 'destination-in' logic or simple fading.
                            // Simpler: Draw Image, then Erase Left side? No.

                            // Plan B: Clip path? No.
                            // Plan C: Draw Image, then overlay a "Fade to Transparent" gradient? No.
                            // Plan D: Draw Image, but set globalAlpha with gradient? Canvas doesn't support gradient alpha for drawImage easily.

                            // Standard Masking way:
                            // We need to draw the Shifted Image ISOLATED, apply mask, then draw result onto main canvas.
                            // But creating new canvas is expensive here?
                            // Use 'layer'? (Not avail).

                            // Fast Hack:
                            // 1. Save context.
                            // 2. Begin Path (Rect covering the right side).
                            // 3. Clip? Hard edge.

                            // Let's stick to the "Portrait" logic for consistent "Cutout" feel if it's too hard?
                            // No, User wants "Full Image" content but shifted.

                            // Okay, the only way to fit 16:9 content on the Right without covering Left is to CROP it or SCALE it down.
                            // "Vẹn cả đôi đường" -> Maybe they want the image SCALED DOWN to fit the right side?
                            // But 16:9 scaled down to 30% width is TINY.

                            // Re-interpreting user: "Image character in main picture didn't move to right".
                            // Means "Move the subject".
                            // I think the best bet is strict Crop/Shift with soft edge.
                            // Let's implement Soft Edge Mask using a second offscreen canvas (it's fast enough).

                            const offCanvas = document.createElement('canvas');
                            offCanvas.width = canvas.width;
                            offCanvas.height = canvas.height;
                            const offCtx = offCanvas.getContext('2d');

                            if (offCtx) {
                                // Draw Shifted Image on Off-Canvas
                                offCtx.drawImage(charImg, xShift, yBg, imgW, imgH);

                                // Apply Alpha Mask to Left Side
                                offCtx.globalCompositeOperation = 'destination-in';
                                const mk = offCtx.createLinearGradient(0, 0, canvas.width, 0);
                                mk.addColorStop(0, "rgba(0,0,0,0)");
                                mk.addColorStop(0.4, "rgba(0,0,0,0)"); // Clear left 40%
                                mk.addColorStop(0.7, "rgba(0,0,0,1)"); // Reveal by 70%
                                offCtx.fillStyle = mk;
                                offCtx.fillRect(0, 0, canvas.width, canvas.height);

                                // Draw Result to Main Canvas
                                ctx.drawImage(offCanvas, 0, 0);
                            }
                        } else {
                            // Standard Portrait Logic (Existing)
                            const h = canvas.height * 0.95;
                            const w = charImg.width * (h / charImg.height);
                            const x = (canvas.width * 0.7) + ((canvas.width * 0.3 - w) / 2);
                            const y = canvas.height - h;

                            ctx.shadowColor = "rgba(0,0,0,0.8)";
                            ctx.shadowBlur = 40;
                            ctx.shadowOffsetX = -10;
                            ctx.drawImage(charImg, x, y, w, h);
                            ctx.shadowBlur = 0;
                        }

                        isUserBackground = true;
                    }
                }
            }

            // Scenario B: AI Generated Background (Only if NOT already drawn a user background)
            if (!isUserBackground && thumbnailUrl) {
                const bgImg = await loadImage(thumbnailUrl);
                if (bgImg) {
                    const scale = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height);
                    const x = (canvas.width / 2) - (bgImg.width / 2) * scale;
                    const y = (canvas.height / 2) - (bgImg.height / 2) * scale;
                    ctx.drawImage(bgImg, x, y, bgImg.width * scale, bgImg.height * scale);
                }
            }

            // 4. Gradient Overlay (Left 70%) - Critical for Text Reading
            const gradientWidth = canvas.width * 0.75;
            const grad = ctx.createLinearGradient(0, 0, gradientWidth, 0);
            grad.addColorStop(0, "rgba(0,0,0, 0.98)");
            grad.addColorStop(0.5, "rgba(0,0,0, 0.85)");
            grad.addColorStop(0.8, "rgba(0,0,0, 0.6)");
            grad.addColorStop(1, "rgba(0,0,0, 0)");

            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 5. Text Rendering
            if (splitTitle.length > 0) {
                const fonts = ['Tahoma', 'Arial Black', 'Segoe UI Black', 'Verdana'];
                const fontName = fonts[designSeed % fonts.length];
                const colors = ['#FCD34D', '#ff1f1f', '#FFFFFF', '#22C55E'];
                const leftMargin = 40;
                const availableWidth = (canvas.width * 0.7) - (leftMargin * 2);
                const totalAvailableHeight = canvas.height * 0.8;
                const lineHeight = totalAvailableHeight / 4;
                const startY = (canvas.height - totalAvailableHeight) / 2 + (lineHeight / 2);

                splitTitle.forEach((line, i) => {
                    if (i >= 4) return;

                    const color = colors[i];
                    let fontSize = lineHeight * 0.8;
                    ctx.font = `900 ${fontSize}px "${fontName}"`;
                    while (ctx.measureText(line).width > availableWidth && fontSize > 30) {
                        fontSize -= 5;
                        ctx.font = `900 ${fontSize}px "${fontName}"`;
                    }

                    const y = startY + (i * lineHeight);

                    // Random Box
                    if (designSeed > 0) {
                        const m = ctx.measureText(line);
                        const p = fontSize * 0.2;
                        const hue = (designSeed * 137 + i * 45) % 360;
                        const boxColor = `hsla(${hue}, 85%, 20%, 0.9)`;

                        ctx.fillStyle = boxColor;
                        const boxX = leftMargin - (p / 2);
                        const boxY = y - (fontSize / 2) - (p / 2);
                        const boxW = m.width + p;
                        const boxH = fontSize + p;

                        ctx.beginPath();
                        if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 12);
                        else ctx.fillRect(boxX, boxY, boxW, boxH);
                        ctx.fill();
                    }

                    ctx.fillStyle = color;
                    ctx.shadowColor = "rgba(0,0,0,1)";
                    ctx.shadowBlur = 4;
                    ctx.shadowOffsetX = 3;
                    ctx.shadowOffsetY = 3;
                    ctx.textBaseline = 'middle';
                    ctx.fillText(line.toUpperCase(), leftMargin, y);
                    ctx.shadowColor = "transparent";
                });
            }

            try {
                setFinalThumbnail(canvas.toDataURL('image/jpeg', 0.9));
            } catch (e) {
                console.warn("Canvas Tainted - Download might fail for bg, but preview ok");
            }

            if (thumbnailUrl && !isUserBackground) {
                ctx.font = "12px monospace";
                ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                ctx.fillRect(0, canvas.height - 24, canvas.width, 24);
                ctx.fillStyle = "#00FF00";
                ctx.fillText(`PROMPT: ${thumbnailUrl.split('prompt/')[1]?.split('?')[0]?.substring(0, 100)}...`, 10, canvas.height - 8);
            }
        };

        render();

    }, [thumbnailUrl, characterImage, splitTitle, designSeed, isFullScreen]);


    return (
        <div className="w-full h-full overflow-auto bg-slate-50 text-slate-900">

            <main className="max-w-6xl mx-auto px-4 mt-8 space-y-12">

                {/* 1. UPLOAD & ANALYZE */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* COL 1: UPLOAD AREA */}
                    <div className="bg-white rounded-3xl p-8 shadow-xl border-4 border-slate-100 flex flex-col gap-6">
                        <div className="flex items-center gap-3 text-indigo-700 border-b pb-4">
                            <ImageIcon className="w-6 h-6" />
                            <h3 className="font-black text-xl uppercase">1. UPLOAD ẢNH MẪU</h3>
                        </div>
                        <label className="flex-1 min-h-[250px] flex flex-col items-center justify-center border-4 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all group relative overflow-hidden bg-slate-50">
                            {uploadedImage ? (
                                <img src={uploadedImage} className="w-full h-full object-contain p-4" alt="Uploaded Preview" />
                            ) : (
                                <div className="text-center p-6">
                                    <div className="bg-white p-4 rounded-full shadow-md inline-flex mb-4 group-hover:scale-110 transition-transform">
                                        <Upload className="text-indigo-500 w-8 h-8" />
                                    </div>
                                    <p className="font-bold text-slate-600 text-lg">Tải ảnh mẫu</p>
                                </div>
                            )}
                            <input type="file" className="hidden" accept="image/*" onChange={handleStyleImageUpload} />
                        </label>
                    </div>

                    {/* COL 2: ANALYSIS RESULT (COMPACT UI) */}
                    <div className="bg-white rounded-3xl p-8 shadow-xl border-4 border-slate-100 flex flex-col gap-6">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div className="flex items-center gap-3 text-indigo-700">
                                <Sparkles className="w-6 h-6" />
                                <h3 className="font-black text-xl uppercase">2. PHÂN TÍCH STYLE</h3>
                            </div>
                            {analysis && (
                                <button onClick={() => setAnalysis("")} className="text-xs text-slate-400 hover:text-red-500">Xóa</button>
                            )}
                        </div>

                        <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-200 min-h-[250px] max-h-[250px] overflow-y-auto text-slate-700 text-sm leading-relaxed custom-scrollbar">
                            {isAnalyzing ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-indigo-600 opacity-75">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <p className="animate-pulse font-bold text-sm">AI đang phân tích...</p>
                                </div>
                            ) : analysis ? (
                                <div className="animate-in fade-in space-y-3">
                                    <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider sticky top-0 bg-opacity-90 backdrop-blur-sm z-10 w-full">
                                        <CheckCircle2 className="w-3 h-3" /> Kết quả phân tích
                                    </div>
                                    <div className="prose prose-sm prose-indigo max-w-none p-2">
                                        {analysis.split('\n').map((line, i) => (
                                            line.trim() && <p key={i} className="mb-2">{line}</p>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 italic text-xs text-center px-4">
                                    <Sparkles className="w-8 h-8 mb-2 opacity-20" />
                                    <p>Upload ảnh bên trái để AI trích xuất phong cách hình ảnh, màu sắc, bố cục...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. SCRIPT INPUT SECTION */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
                    <div className="flex items-center gap-3 text-indigo-700 mb-6">
                        <FileText className="w-7 h-7" />
                        <h3 className="font-black text-2xl uppercase">3. NHẬP KỊCH BẢN</h3>
                    </div>
                    <textarea
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        placeholder="Dán nội dung kịch bản video vào đây..."
                        className="w-full min-h-[150px] p-6 bg-slate-50 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:bg-white transition-all outline-none text-slate-700 font-medium resize-y"
                    />
                </div>

                {/* 3. AI TIÊU ĐỀ SECTION */}
                <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-black rounded-[2.5rem] p-10 shadow-2xl text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col gap-6">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <h3 className="font-black text-2xl uppercase tracking-widest flex items-center gap-3">
                                <Type className="text-yellow-400 w-8 h-8" /> AI TIÊU ĐỀ
                            </h3>
                            <button
                                onClick={handleGenerateTitle}
                                disabled={!!loadingAction}
                                className={`px-6 py-3 rounded-full font-bold transition-all flex items-center gap-2 shadow-lg backdrop-blur-sm
                                    ${loadingAction === 'title'
                                        ? 'bg-white/10 text-white/50 cursor-not-allowed'
                                        : 'bg-white text-indigo-900 hover:bg-indigo-50 hover:scale-105 active:scale-95'
                                    }
                                `}
                            >
                                {loadingAction === 'title' ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                                {loadingAction === 'title' ? 'Đang viết...' : 'TẠO TIÊU ĐỀ VIRAL'}
                            </button>
                        </div>

                        <div className="space-y-4">
                            <label className="text-indigo-200 text-sm font-bold uppercase tracking-wider">Tiêu đề đề xuất:</label>
                            <div className="flex gap-4">
                                <input
                                    value={title}
                                    onChange={(e) => { setTitle(e.target.value); setIsTitleSaved(false); }}
                                    placeholder="Tiêu đề sẽ hiện ở đây..."
                                    className={`flex-1 bg-white/10 border-2 rounded-2xl px-6 py-4 text-xl md:text-2xl font-bold text-yellow-300 placeholder-white/20 focus:bg-white/20 outline-none transition-all
                                        ${isTitleSaved ? 'border-green-500/50' : 'border-white/10 focus:border-yellow-400/50'}
                                    `}
                                />
                                <button
                                    onClick={() => setIsTitleSaved(true)}
                                    className={`px-6 rounded-2xl font-bold flex items-center gap-2 transition-all min-w-[120px] justify-center
                                        ${isTitleSaved
                                            ? 'bg-green-500 text-white cursor-default shadow-none'
                                            : 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-lg hover:shadow-yellow-500/20'
                                        }
                                    `}
                                >
                                    {isTitleSaved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                                    {isTitleSaved ? 'ĐÃ LƯU' : 'LƯU'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. DESCRIPTION & HASHTAGS SECTION */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
                    <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                        <div className="flex items-center gap-3 text-indigo-700">
                            <FileText className="w-7 h-7" />
                            <h3 className="font-black text-2xl uppercase">4. MÔ TẢ & HASHTAGS</h3>
                        </div>
                        <button
                            onClick={handleGenerateDescription}
                            disabled={!!loadingAction}
                            className={`px-6 py-3 rounded-full font-bold transition-all flex items-center gap-2 text-sm shadow-md
                                ${loadingAction === 'desc'
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-slate-900 text-white hover:bg-black hover:scale-105'
                                }
                            `}
                        >
                            <Sparkles className="w-4 h-4" />
                            {loadingAction === 'desc' ? 'Đang viết...' : 'Tạo Mô Tả & Hashtags'}
                        </button>
                    </div>

                    {descriptionData && (
                        <div className="space-y-6 animate-in slide-in-from-top-4">
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 relative group">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Mô tả nội dung</h4>
                                <p className="text-slate-800 font-medium leading-relaxed text-lg">{descriptionData.text}</p>
                                <button
                                    onClick={() => navigator.clipboard.writeText(descriptionData.text)}
                                    className="absolute top-4 right-4 p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {descriptionData.hashtags.map((tag, i) => (
                                    <span key={i} className="bg-indigo-50 text-indigo-600 px-5 py-2 rounded-full font-bold text-sm border border-indigo-100 shadow-sm">
                                        #{tag.replace(/^#/, '')}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 5. THUMBNAIL STUDIO (NEW) */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl text-white border border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-3 text-emerald-400 mb-6 border-b border-emerald-500/20 pb-4">
                        <ImageIcon className="w-8 h-8" />
                        <h3 className="font-black text-2xl uppercase tracking-widest">5. THUMBNAIL STUDIO</h3>
                    </div>

                    {/* TABS - Removed KB tab, only NV mode */}
                    <div className="flex p-1 bg-slate-800 rounded-2xl mb-8 w-fit">
                        <button
                            className="px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 bg-blue-500 text-white shadow-lg"
                        >
                            <Users className="w-4 h-4" /> Thumbnail Theo NV
                        </button>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* CONTROLS */}
                        <div className="xl:col-span-1 space-y-6">
                            {/* Char Upload - Always shown in NV mode */}
                            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 animate-in slide-in-from-left-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-blue-300 flex items-center gap-2">
                                        <Upload className="w-5 h-5" /> Nhân vật
                                    </h4>
                                    {/* Full Screen Toggle */}
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white bg-slate-700/50 px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-all border border-slate-600">
                                        <input
                                            type="checkbox"
                                            checked={isFullScreen}
                                            onChange={(e) => setIsFullScreen(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-500 text-blue-500 focus:ring-offset-0 focus:ring-0"
                                        />
                                        Gốc (16:9)
                                    </label>
                                </div>
                                <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-slate-800 transition-all overflow-hidden relative">
                                    {characterImage ? (
                                        <img src={characterImage} className="w-full h-full object-contain" alt="Character" />
                                    ) : (
                                        <div className="text-center text-slate-500">
                                            <Upload className="w-8 h-8 mx-auto mb-2" />
                                            <span className="text-xs font-bold uppercase">Upload Ảnh NV</span>
                                        </div>
                                    )}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleCharacterUpload} />
                                </label>
                            </div>

                            {/* Actions */}
                            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 space-y-4">
                                <button
                                    onClick={handleCreateThumbnail}
                                    disabled={loadingAction === 'thumb'}
                                    className={`w-full py-4 rounded-xl font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all
                                        ${loadingAction === 'thumb'
                                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                            : 'bg-emerald-500 hover:bg-emerald-400 text-white hover:scale-[1.02]'
                                        }
                                    `}
                                >
                                    {loadingAction === 'thumb' ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                                    {loadingAction === 'thumb' ? 'Đang thiết kế...' : 'TẠO THUMBNAIL'}
                                </button>

                                {finalThumbnail && (
                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        <button
                                            onClick={() => setDesignSeed(prev => prev + 1)}
                                            className="py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2"
                                        >
                                            <Shuffle className="w-4 h-4" /> Random Style
                                        </button>
                                        <button
                                            onClick={downloadThumbnail}
                                            className="py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/50"
                                        >
                                            <Download className="w-4 h-4" /> Tải về
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CANVAS PREVIEW */}
                        <div className="xl:col-span-2">
                            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border-2 border-slate-700 shadow-2xl group">

                                {/* 1. BACKGROUND LAYER (IMG) - Absolute, Backend */}
                                {thumbnailUrl && (
                                    <img
                                        src={thumbnailUrl}
                                        alt="Background"
                                        className="absolute inset-0 w-full h-full object-cover z-0 opacity-100"
                                    />
                                )}

                                {/* 2. CANVAS LAYER (Text + Overlay) - Absolute, Frontend */}
                                <canvas ref={canvasRef} width={1280} height={720} className="relative z-10 w-full h-full object-contain" />

                                {finalThumbnail && (
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <button
                                            onClick={() => setShowZoom(true)}
                                            className="p-2 bg-black/50 backdrop-blur text-white rounded-lg hover:bg-white hover:text-black transition-all"
                                        >
                                            <Maximize2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </main>

            {/* ZOOM OVERLAY */}
            {showZoom && finalThumbnail && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-8 backdrop-blur-xl animate-in fade-in" onClick={() => setShowZoom(false)}>
                    {/* Prefer Background + Overlay logic again or just the canvas data? 
                        Canvas Data is transparent for BG now. 
                        Composite for zoom is hard without single image.
                        SIMPLE FIX: Just show the canvas data (Text) on top of the black bg in Zoom?
                        Or try to composite in memory.
                        For now, just show what we have.
                    */}
                    <div className="relative max-w-full max-h-full">
                        {thumbnailUrl && <img src={thumbnailUrl} className="absolute inset-0 w-full h-full object-cover opacity-50" />}
                        <img src={finalThumbnail} className="relative z-10 rounded-lg shadow-2xl border border-white/10" alt="Zoom Preview" />
                    </div>

                    <button className="absolute top-8 right-8 text-white/50 hover:text-white p-2">
                        <X className="w-8 h-8" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ThumbHuyApp;
