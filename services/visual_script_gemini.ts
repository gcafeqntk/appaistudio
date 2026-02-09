import { GoogleGenerativeAI } from "@google/generative-ai";

interface AnalysisResult {
    breakdown: string;
    count: number;
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
            { text: "Hãy phân tích chi tiết phong cách hình ảnh trong bức ảnh này: ánh sáng, màu sắc, góc máy, chất liệu nghệ thuật (medium), tâm trạng và các đặc điểm hình ảnh đặc trưng khác. Trả về mô tả ngắn gọn nhưng súc tích bằng tiếng Việt." }
        ]);
        return result.response.text() || "Không thể phân tích phong cách.";
    });
};

export const analyzeScriptScenes = async (script: string, apiKey?: string): Promise<AnalysisResult> => {
    return generateWithFallback(apiKey, async (model) => {
        // Note: Some models support JSON schema, others don't well. 
        // We use text prompt with JSON structure request to be safe across all models.
        const prompt = `Nhiệm vụ: Đọc kịch bản dưới đây và chia tách thành các phân cảnh hình ảnh tiêu biểu (Scene Breakdown). Mỗi phân đoạn phải đại diện cho một thông điệp hoặc giai đoạn cảm xúc. Sau đó hãy đếm tổng số phân đoạn.
      
      Kịch bản: "${script}"
      
      Trả về JSON: { "breakdown": string, "count": number }`;

        // Attempting to force JSON mimeType if supported
        const generationConfig = { responseMimeType: "application/json" };

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig
        });
        const data = JSON.parse(result.response.text() || "{}");
        let breakdown = data.breakdown || "";
        if (typeof breakdown !== 'string') {
            breakdown = JSON.stringify(breakdown);
        }
        return {
            breakdown: breakdown,
            count: Number(data.count) || 0
        };
    });
};

export const splitScriptRows = async (script: string, analysis: string, count: number, apiKey?: string): Promise<string[]> => {
    return generateWithFallback(apiKey, async (model) => {
        const prompt = `Dựa vào phân tích phân cảnh: "${analysis}" và số lượng ${count} phân đoạn. Hãy chia nội dung kịch bản gốc dưới đây thành đúng ${count} hàng tương ứng với các phân đoạn.
        
        QUY TẮC CỰC KỲ QUAN TRỌNG:
        - KHÔNG ĐƯỢC XOÁ BỎ BẤT CỨ KÝ TỰ NÀO của kịch bản gốc.
        - Chỉ được thêm xuống dòng để phân tách các đoạn.
        - Trả về danh sách các chuỗi tương ứng với mỗi phân cảnh.
        
        Kịch bản gốc: "${script}"`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
        const parsed = JSON.parse(result.response.text() || "[]");

        // Sanitize: ensure we have an array of strings
        if (Array.isArray(parsed)) {
            return parsed.map(item => {
                if (typeof item === 'string') return item;
                if (typeof item === 'object' && item !== null) {
                    // Try to extract content from common keys if the model returned objects
                    // Sometimes Gemini returns objects with keys like "scene_number", "content", "description"
                    return (item as any).content || (item as any).text || (item as any).description || (item as any).script_content || (item as any).row || JSON.stringify(item);
                }
                return String(item);
            });
        }
        return [];
    });
};

export const generateImagePrompts = async (rows: string[], style: string, apiKey?: string): Promise<string[]> => {
    return generateWithFallback(apiKey, async (model) => {
        const prompt = `Hãy tạo ra Image Prompts cho Midjourney/Stable Diffusion dựa trên các đoạn kịch bản sau và phong cách hình ảnh được cung cấp.
        
        Phong cách (Style): ${style}
        
        Cấu trúc Prompt (Tiếng Anh): [Subject], [Action], [Environment], [Lighting/Atmosphere], [Camera Angle/Lens], [Style].
        
        Các đoạn kịch bản cần tạo prompt:
        ${rows.map((r, i) => `${i + 1}. ${r}`).join('\n')}
        
        Trả về mảng JSON chứa các prompt tương ứng theo thứ tự (mảng string).`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
        return JSON.parse(result.response.text() || "[]");
    });
};

export const generateVideoPrompts = async (rows: string[], style: string, analysis: string, apiKey?: string): Promise<string[]> => {
    return generateWithFallback(apiKey, async (model) => {
        const prompt = `Bạn là một chuyên gia quay video chuyên nghiệp, một Visual Director tài năng. 
        Nhiệm vụ của bạn là dựa theo phong cách (style) và phân tích phân cảnh đã có, tạo ra các "Video Motion Prompts" cực kỳ đặc sắc và chuyên nghiệp cho từng phân đoạn kịch bản.

        PHONG CÁCH PHÂN TÍCH (STYLE): 
        ${style}

        PHÂN TÍCH PHÂN CẢNH: 
        ${analysis}

        CÁC PHÂN ĐOẠN KỊCH BẢN:
        ${rows.map((r, i) => `Phân đoạn ${i + 1}: ${r}`).join('\n')}

        YÊU CẦU CẤU TRÚC PROMPT (BẮT BUỘC):
        Mỗi prompt video phải tuân thủ tuyệt đối cấu trúc sau, ngăn cách bởi dấu phẩy:
        [style], [bối cảnh], [camera], [action], [ánh sáng điện ảnh], [màu sắc]

        QUY TẮC THỰC HIỆN:
        1. [style]: Sử dụng thông tin từ "Phong cách phân tích" để tạo mô tả style nhất quán.
        2. [bối cảnh]: Dựa vào nội dung kịch bản và phân tích phân cảnh để mô tả không gian chi tiết.
        3. [camera]: Thể hiện sự chuyên nghiệp của bạn bằng các thuật ngữ quay phim (ví dụ: cinematic drone shot, extreme close-up, low angle tracking, shallow depth of field, v.v.).
        4. [action]: Mô tả chuyển động của chủ thể một cách sống động, đúng bản chất kịch bản.
        5. [ánh sáng điện ảnh] & [màu sắc]: Mô tả ánh sáng (volumetric lighting, golden hour, neon glow...) và bảng màu (vibrant, moody, teal and orange...) phù hợp với style.
        6. TRẢ VỀ ĐÚNG ${rows.length} PROMPT, mỗi prompt tương ứng với một phân đoạn kịch bản. 
        7. Không dư, không thiếu, không giải thích, không đánh số. Mỗi prompt 1 hàng.

        Trả về mảng JSON (mảng string).`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
        return JSON.parse(result.response.text() || "[]");
    });
};
