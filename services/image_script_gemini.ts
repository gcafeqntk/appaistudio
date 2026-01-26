import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

interface Character {
    name: string;
    gender: string;
    country: string;
    age: string;
    physique: string;
    features: string;
}

// --- HELPERS ---

const resolveKeys = (input?: string): string[] => {
    let keys: string[] = [];
    if (input) {
        keys = input.split('\n').map(k => k.trim()).filter(k => k);
    }
    // Fallback to env
    if (keys.length === 0) {
        const envKey = process.env.API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
        if (envKey) keys.push(envKey);
    }
    return keys;
};

// Priority: Lite -> Standard -> Experimental -> Pro -> Legacy
const MODEL_FALLBACKS = [
    'gemini-2.0-flash-lite-preview-02-05',
    'gemini-2.5-flash',
    'gemini-2.0-flash-lite-001',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash-001',
    'gemini-2.0-flash',
    'gemini-2.5-pro',
    'gemini-flash-latest'
];

/**
 * Executes a Generative AI operation with robust fallback:
 * 1. Rotates through ALL provided API Keys.
 * 2. For each Key, rotates through ALL available Models.
 */
const generateWithFallback = async <T>(
    apiKeyInput: string | undefined,
    operation: (model: any) => Promise<T>
): Promise<T> => {
    const keys = resolveKeys(apiKeyInput);
    if (keys.length === 0) throw new Error("No API Keys provided.");

    let lastError: any;

    for (const key of keys) {
        const genAI = new GoogleGenerativeAI(key);
        for (const modelName of MODEL_FALLBACKS) {
            try {
                // console.log(`Attempting: Key(...${key.slice(-4)}) + Model(${modelName})`);
                const model = genAI.getGenerativeModel({ model: modelName });
                return await operation(model);
            } catch (err: any) {
                console.warn(`Failed: Key(...${key.slice(-4)}) Model(${modelName}) error: ${err.message}`);
                lastError = err;
                // Continue to next model/key
            }
        }
    }
    throw lastError || new Error("All keys and models failed to generate content.");
};

// --- EXPORTED FUNCTIONS ---

export const analyzeImageStyle = async (base64Image: string, apiKey?: string): Promise<string> => {
    return generateWithFallback(apiKey, async (model) => {
        const result = await model.generateContent([
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: "Analyze this image and describe its visual style in detail (lighting, color palette, texture, composition, atmosphere). Provide a concise but comprehensive paragraph suitable for an image generation prompt style reference." }
        ]);
        return result.response.text() || "No analysis found.";
    });
};

export const extractCharacters = async (script: string, apiKey?: string): Promise<Character[]> => {
    return generateWithFallback(apiKey, async (model) => {
        // Schema adaptation for @google/generative-ai
        const schema = {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    name: { type: SchemaType.STRING },
                    gender: { type: SchemaType.STRING },
                    country: { type: SchemaType.STRING },
                    age: { type: SchemaType.STRING },
                    physique: { type: SchemaType.STRING },
                    features: { type: SchemaType.STRING }
                },
                required: ["name", "gender", "country", "age", "physique", "features"]
            }
        };

        // Note: We need to recreate the model with schema if supported, or pass prompt instructions.
        // The shared 'model' object passed here is generic. 
        // Ideally we should modify generateWithFallback to allow config, but for simplicity we rely on prompt + schema config in generateContent.
        // However, 'getGenerativeModel' is where config is set.
        // To support schema, we might need to rely on text parsing if the model doesn't support schema at runtime configuration easily without new instance.
        // Fortunately, GoogleGenerativeAI models allow 'generationConfig' in 'generateContent' in some SDK versions, but standard is at initialization.
        // To be safe and robust across all models (some might not support schema well), we will use JSON Mode via MimeType.

        const prompt = `Analyze the following script and extract/create characters. For each character, provide: Name, Gender, Country, Age, Physique, and Detailed Facial Features. 
        
        CRITICAL RULES:
        1. If details are missing in the script (Gender, Country, Age, Physique, or Face), you MUST creatively generate them to make the character visually distinct.
        2. Focus HEAVILY on specific facial features: eye shape/color, nose shape, skin texture, wrinkles, hair style/texture/color, and any unique facial markings.
        3. ABSOLUTELY NO clothing, NO personality traits, and NO equipment.
        4. Format the 'features' field as descriptive sentences about the face and hair only.
        
        Example structure: "Mái tóc đen bóng mượt với những sợi bạc thanh lịch được búi chặt thành kiểu tóc truyền thống gọn gàng. Làn da mịn màng. Đôi mắt nâu sẫm hình quả hạnh ấm áp, nếp nhăn nhẹ quanh khóe mắt, chiếc mũi nhỏ nhắn, thanh tú."
        
        Output in JSON format as an array of objects. Script: ${script}`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });

        return JSON.parse(result.response.text() || "[]");
    });
};

export const analyzeActionCount = async (script: string, apiKey?: string): Promise<number> => {
    return generateWithFallback(apiKey, async (model) => {
        const prompt = `Bạn là chuyên gia phân tích kịch bản. Hãy đếm số lượng "hành động thị giác" (visual actions) chính trong kịch bản dưới đây.
        
        QUY TẮC:
        1. Chỉ đếm các hành động cụ thể có thể dựng thành hình ảnh (ví dụ: "chạy", "cầm bento", "nhìn xa xăm").
        2. Bỏ qua các lời dẫn truyện (narration) mang tính suy tưởng và các suy nghĩ nội tâm không thể hiện qua hành động/biểu cảm.
        3. Trả về DUY NHẤT một con số.
        
        KỊCH BẢN:
        ${script}`;

        const result = await model.generateContent(prompt);
        const count = parseInt(result.response.text()?.trim() || "0");
        return isNaN(count) ? 0 : count;
    });
};

export const splitScriptIntoRows = async (content: string, count: number, apiKey?: string): Promise<string[]> => {
    return generateWithFallback(apiKey, async (model) => {
        const prompt = `Bạn là một công cụ chia kịch bản chuyên nghiệp. Hãy chia kịch bản dưới đây thành đúng ${count} hàng.
        
        CÁC QUY TẮC TỐI THƯỢNG:
        1. CHỈ TRẢ VỀ CÁC HÀNG KỊCH BẢN. Không có bất kỳ câu dẫn nhập nào.
        2. GIỮ NGUYÊN 100% VĂN BẢN GỐC. Tuyệt đối không xóa bỏ, không chỉnh sửa, không thêm bớt bất kỳ ký tự nào.
        3. Trả về đúng ${count} dòng, mỗi dòng là một phân đoạn logic.
        
        KỊCH BẢN:
        ${content}`;

        const result = await model.generateContent(prompt);
        const text = (result.response.text() || "").trim();
        return text.split('\n').filter(l => l.trim().length > 0);
    });
};

export const generatePrompts = async (
    rows: string[],
    visualStyle: string,
    characters: Character[],
    previousContext?: string,
    apiKey?: string
): Promise<{ prompts: string[] }> => {
    return generateWithFallback(apiKey, async (model) => {
        const charDatabase = characters.map(c =>
            `${c.name}: ${c.gender}, ${c.country}, ${c.age}, ${c.physique}. ${c.features}`
        ).join('\n');

        const prompt = `Bạn là ZenShot AI - Một Visual Director kỷ luật sắt đá. Nhiệm vụ của bạn là chuyển đổi kịch bản thành Image Prompts cho Midjourney.
    
    QUY TẮC CỐT LÕI (BẮT BUỘC TUÂN THỦ 100%):
    1. ĐỊNH DẠNG: Mỗi prompt phải nằm trên MỘT HÀNG DUY NHẤT (Single line). Không xuống dòng bên trong một prompt.
    2. KHÔNG TÓM TẮT: Copy-paste NGUYÊN VĂN mô tả nhân vật từ dữ liệu bên dưới.
    3. BỘ NHỚ TRẠNG THÁI:
       - Nếu có thông tin cảnh trước (Previous Context), hãy kế thừa trang phục và bối cảnh từ đó trừ khi kịch bản thay đổi.
       - Luôn duy trì tính nhất quán về quần áo và bối cảnh cho các phân đoạn liên tiếp.
    4. CẤU TRÚC PROMPT (Viết liền thành 1 đoạn văn): 
       [Phong cách/Góc máy] + [Hành động/Biểu cảm] + [Tên nhân vật: Mô tả chi tiết nguyên văn] + [Trang phục hiện tại] + [Bối cảnh chi tiết] + --ar 16:9
    
    DỮ LIỆU NHÂN VẬT:
    ${charDatabase}
    
    PHONG CÁCH VISUAL:
    ${visualStyle}
    
    BỐI CẢNH/TRANG PHỤC CỦA CÁC TAG TRƯỚC (NẾU CÓ):
    ${previousContext || "Không có cảnh trước."}
    
    HÃY TẠO PROMPT CHO CÁC PHÂN ĐOẠN SAU (Mỗi prompt 1 hàng):
    ${rows.map((r, i) => `Row ${i + 1}: ${r}`).join('\n')}
    
    Chỉ trả về danh sách các prompt. Mỗi prompt là 1 hàng.`;

        const result = await model.generateContent(prompt);
        const rawPrompts = (result.response.text() || "").split('\n').filter(p => p.trim().length > 0);
        return { prompts: rawPrompts };
    });
};

export const generateVideoPrompts = async (
    hookContent: string,
    visualStyle: string,
    characters: Character[],
    context?: string,
    apiKey?: string
): Promise<string[]> => {
    return generateWithFallback(apiKey, async (model) => {
        const charDatabase = characters.map(c =>
            `${c.name}: ${c.gender}, ${c.country}, ${c.age}, ${c.physique}. ${c.features}`
        ).join('\n');

        const prompt = `Bạn là Đạo diễn hình ảnh (Visual Director) chuyên về Video/Cinematic. Nhiệm vụ của bạn là phân tích nội dung đoạn "Hook" và tạo Video Prompts (diễn tả chuyển động).
    
    YÊU CẦU CHI TIẾT:
    1. PHÂN TÍCH HÀNH ĐỘNG: Mỗi hành động cụ thể trong đoạn Hook phải có một prompt riêng biệt.
    2. ĐỒNG BỘ NHÂN VẬT: Copy-paste NGUYÊN VĂN mô tả nhân vật từ dữ liệu bên dưới khi nhân vật đó xuất hiện trong hành động.
    3. CHUYỂN ĐỘNG (MOTION): Mô tả rõ loại chuyển động (ví dụ: "Slo-mo walking", "Cinematic drone shot following", "Close-up of facial expression change").
    4. BỐI CẢNH/TRANG PHỤC: Kế thừa từ thông tin bối cảnh đã cung cấp.
    5. ĐỊNH DẠNG: Mỗi prompt là 1 hàng duy nhất.
    
    CẤU TRÚC PROMPT:
    [Loại chuyển động/Góc máy] + [Hành động nhân vật] + [Mô tả nhân vật chi tiết] + [Trang phục & Bối cảnh]
    
    DỮ LIỆU NHÂN VẬT:
    ${charDatabase}
    
    PHONG CÁCH VISUAL:
    ${visualStyle}
    
    BỐI CẢNH/TRANG PHỤC KẾ THỪA:
    ${context || "Tự do sáng tạo dựa trên không khí chung."}
    
    NỘI DUNG ĐOẠN HOOK CẦN XỬ LÝ:
    ${hookContent}
    
    Chỉ trả về danh sách các prompt video, mỗi prompt một hàng.`;

        const result = await model.generateContent(prompt);
        return (result.response.text() || "").split('\n').filter(p => p.trim().length > 0);
    });
};
