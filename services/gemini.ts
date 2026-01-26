import { GoogleGenerativeAI } from "@google/generative-ai";
import { Idea, CharacterProfile, ActionDetail } from "../types";
import { handleGeminiError } from "../utils/geminiErrorUtils";

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

// Also support legacy global setter for backward compatibility if needed, 
// though we prefer passing apiKey in args.
let globalApiKeys: string[] = [];
export const setGeminiKeys = (keys: string[]) => {
  globalApiKeys = keys.filter(k => k.trim() !== '');
};

// Priority: Lite -> Standard -> Experimental -> Pro -> Legacy
// We can use a different list for text-heavy tasks vs lightweight.
// For now, use a general robust list.
const MODEL_FALLBACKS = [
  'gemini-2.0-flash-lite-preview-02-05',
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite-001',
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
  // Combine input keys with global keys if input is empty
  let keys = resolveKeys(apiKeyInput);
  if (keys.length === 0 && globalApiKeys.length > 0) {
    keys = globalApiKeys;
  }

  if (keys.length === 0) throw new Error("No API Keys provided.");

  let lastError: any;

  for (const key of keys) {
    const genAI = new GoogleGenerativeAI(key);
    for (const modelName of MODEL_FALLBACKS) {
      try {
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

export const analyzeOpponentScript = async (script: string, apiKey?: string) => {
  return generateWithFallback(apiKey, async (model) => {
    const prompt = `
        Đọc toàn bộ "Kịch bản đối thủ" sau và phân tích theo quy tắc:
        Kịch bản: """${script}"""

        Mục tiêu: Rút ra khung xương cấu trúc cảm xúc (Hook, Build-up, Value/Twist, CTA).
        
        Yêu cầu:
        1. Xác định ranh giới phần theo chức năng cảm xúc.
        2. Với từng phần mô tả: Nội dung chính, Cảm xúc chủ đạo, Cách truyền tải cảm xúc, Lý do hiệu quả.
        3. Rút ra: 3 yếu tố cốt lõi, Đặc điểm ngôn ngữ & tiết tấu (5-8 điểm), 3 pattern cảm xúc.
        
        Ràng buộc: Không thêm nhân vật/bối cảnh ngoài script. Không đánh giá cảm tính. 
        KẾT THÚC BẰNG MỘT ĐOẠN RIÊNG BIỆT CÓ TIÊU ĐỀ "PHONG CÁCH ĐỐI THỦ" liệt kê các đặc điểm phong cách để bước sau sử dụng.
      `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  });
};

export const generateIdeas = async (skeleton: string, apiKey?: string) => {
  return generateWithFallback(apiKey, async (model) => {
    const prompt = `
        Dựa trên kết quả phân tích khung xương sau:
        """${skeleton}"""
        
        Nhiệm vụ: Sáng tạo ra 5 ý tưởng nội dung video mới, giữ nguyên "linh hồn cảm xúc" của kịch bản gốc.
        
        Mỗi ý tưởng gồm:
        - Tiêu đề ngắn
        - Mô tả nội dung (3-5 câu)
        - Nhân vật/Bối cảnh
        - Giá trị nổi bật (Cảm xúc/Thực tiễn)
        - Khả năng lan truyền

        Response must be a valid JSON array matching the schema:
        [{ "id": number, "title": string, "description": string, "charactersContext": string, "highlightValue": string, "viralPotential": string }]
      `;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(result.response.text()) as Idea[];
  });
};

export const buildOutline = async (skeleton: string, idea: Idea, targetCount: number, apiKey?: string) => {
  return generateWithFallback(apiKey, async (model) => {
    const prompt = `
        Xây dựng dàn ý chi tiết dựa trên:
        - Khung xương gốc: """${skeleton}"""
        - Ý tưởng chọn: """${JSON.stringify(idea)}"""
        - Tổng số từ mục tiêu: ${targetCount}

        Cấu trúc: Giữ nguyên form gốc (Hook -> Build-up -> Value/Twist -> CTA).
        Yêu cầu: Với mỗi phần nêu rõ: Mục tiêu, Cảm xúc chính, Nội dung triển khai, Liên kết trước-sau, Số từ phân bổ.
      `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  });
};

export const writeFinalScript = async (outline: string, style: string, apiKey?: string) => {
  return generateWithFallback(apiKey, async (model) => {
    const prompt = `
        Viết lời thoại kịch bản hoàn chỉnh (voice-ready) dựa trên dàn ý và phong cách sau:
        - Dàn ý: """${outline}"""
        - Phong cách mô phỏng: """${style}"""

        QUY TẮC NGHIÊM NGẶT:
        1. Chỉ trả về lời thoại sạch 100%. Không tiêu đề, không chú thích, không ngoặc ( ), không nhạc nền.
        2. Viết liền mạch theo thứ tự Hook -> Build-up -> Value/Twist -> CTA.
      `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  });
};

export const recommendStyle = async (script: string, availableStyles: string[], apiKey?: string) => {
  return generateWithFallback(apiKey, async (model) => {
    const prompt = `
        Dựa trên kịch bản video sau:
        """${script}"""
        
        Hãy chọn ra 1 phong cách hình ảnh phù hợp nhất từ danh sách sau:
        ${availableStyles.join(", ")}
        
        Chỉ trả về duy nhất tên ID của phong cách đó, không giải thích gì thêm.
      `;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  });
};

export const designCharacters = async (script: string, style: string, apiKey?: string) => {
  return generateWithFallback(apiKey, async (model) => {
    const prompt = `
        Dựa trên kịch bản sau và phong cách hình ảnh [${style}]:
        Kịch bản: """${script}"""
        
        Hãy thiết kế chi tiết các nhân vật xuất hiện trong kịch bản. Nếu kịch bản không mô tả rõ, hãy tự sáng tạo chi tiết để đảm bảo tính thẩm mỹ và đồng bộ.
        
        QUY TẮC BẮT BUỘC: 
        1. Phần "bodyType" (Dáng người): Ghi CỰC KỲ NGẮN GỌN (ví dụ: "Cao gầy", "Mập mạp", "Cân đối", "Vạm vỡ").
        2. Phần "facialDetails" (Đặc điểm khuôn mặt): 
           - Nếu kịch bản thiếu, hãy tự thêm cho đầy đủ nhưng phải MÔ TẢ GỌN GÀNG, KHÔNG LẰNG NHẰNG, KHÔNG VĂN HOA. 
           - CHỈ ĐƯỢC MÔ TẢ TRẠNG THÁI BÌNH THƯỜNG/TRUNG TÍNH (Neutral expression).
           - TUYỆT ĐỐI KHÔNG đưa vào cảm xúc hay tình huống cụ thể (ví dụ: KHÔNG ghi "đang khóc", "mặt lấm lem", "cười nham hiểm"). Chỉ mô tả cấu trúc vật lý (mắt, mũi, miệng, da, tóc...).

        Trả về định dạng JSON mảng các đối tượng:
        - name: Tên nhân vật
        - gender: Giới tính
        - country: Quốc gia/Chủng tộc
        - age: Độ tuổi
        - bodyType: Dáng người (ngắn gọn nhất có thể)
        - facialDetails: Đặc điểm chi tiết khuôn mặt (cấu trúc vật lý, gọn gàng, không cảm xúc)
      `;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(result.response.text()) as CharacterProfile[];
  });
};

export const analyzeActionsForTag = async (tagContent: string, style: string, characters: CharacterProfile[], apiKey?: string) => {
  return generateWithFallback(apiKey, async (model) => {
    const charDetailsStr = characters.map(c =>
      `[Nhân vật: ${c.name} | Giới tính: ${c.gender} | Quốc gia: ${c.country} | Tuổi: ${c.age} | Dáng người: ${c.bodyType} | Khuôn mặt: ${c.facialDetails}]`
    ).join('\n');

    const prompt = `
        Bạn là một CHUYÊN GIA PHÂN TÍCH TÌNH HUỐNG và đạo diễn hình ảnh đại tài.
        Nhiệm vụ: Phân tích kịch bản sau để trích xuất các hành động quay (Shot Action).

        Kịch bản: """${tagContent}"""
        
        THÔNG TIN NHÂN VẬT GỐC (BẮT BUỘC PHẢI SAO CHÉP CHÍNH XÁC KHI NHẮC ĐẾN):
        ${charDetailsStr}

        NGUYÊN TẮC PHÂN TÍCH TÌNH HUỐNG (SITUATIONAL ANALYSIS):
        1. QUAN SÁT NGỮ CẢNH: Dựa vào nội dung liền trước (nếu có) và liền sau của mỗi hành động, hãy suy luận logic xem nhân vật nào ĐANG CÓ MẶT trong cảnh đó.
        2. DỰ ĐOÁN NHÂN VẬT: Nếu kịch bản không nhắc tên nhưng logic tình huống cho thấy nhân vật đó phải ở đó (ví dụ: đang đối thoại, đang đứng cạnh), BẮT BUỘC phải đưa họ vào.
        3. HIỂN THỊ TRONG 'ACTION': Trong trường 'action' (Mô tả ngắn hành động), hãy liệt kê tên các nhân vật có mặt đầu tiên, sau đó đến mô tả hành động.

        QUY TẮC TẠO PROMPT (Strict Compliance - Rules Override All):

        0. [TUÂN THỦ TUYỆT ĐỐI - KHÔNG ĐƯỢC BỎ TRỐNG]:
           - Trường 'imagePrompt' (Stable Image AI Prompt) là BẮT BUỘC CHO MỌI ACTION.
           - Tuyệt đối KHÔNG trả về chuỗi rỗng "" cho imagePrompt.
           - Nếu không nghĩ ra prompt mới, hãy copy nội dung từ motionPrompt sang và lược bỏ các yếu tố chuyển động camera.
        
        1. [VISUAL STYLE]: Luôn bắt đầu bằng phong cách: [${style}].

        2. [Bối cảnh] (Context Memory):
           - Nếu kịch bản không nêu rõ, hãy TỰ THÊM chi tiết (bàn ghế, đồ vật, bố cục...).
           - Cơ chế GHI NHỚ: Nếu bối cảnh chưa đổi so với shot trước, hãy DÙNG LẠI bối cảnh cũ. Nếu đổi, hãy thiết lập bối cảnh mới chi tiết và ghi nhớ cho các shot sau.

        3. [CAMERA]: Góc máy, chuyển động máy (Cinematic wording).

        4. [ACTION] (Character Consistency):
           - Khi nhắc đến nhân vật nào, BẮT BUỘC COPY NGUYÊN VĂN "Đặc điểm nhân vật" (Giới tính, Tuổi, Dáng, Khuôn mặt) vào prompt. KHÔNG TÓM TẮT.
           - AI tự đọc kịch bản để bố trí vị trí nhân vật logic.
           - QUAN TRỌNG: Nếu shot chỉ có ĐÚNG 1 nhân vật, bắt buộc thêm dòng: "The scene contains EXACTLY ONE character" vào cuối phần Action.

        5. [Trang Phục] (Costume Memory):
           - Nếu kịch bản không nêu, hãy tự thêm và ghi màu sắc cụ thể.
           - Cơ chế GHI NHỚ: Tương tự bối cảnh, lặp lại trang phục nếu chưa đổi cảnh/thời gian.

        6. [AUDIO/VOICE – LIP SYNC] (Video Only):
           - Cấu trúc: [Tên nhân vật nói: "Lời thoại trong Master Transcript"]
           - Nếu không có thoại, bỏ qua hoặc ghi nhạc nền.

        7. [SPEECH SYNC] (Video Only):
           - Nếu có lời thoại, BẮT BUỘC ghi: "Chuyển động miệng nhân vật đồng bộ với lời thoại".

        8. [TECHNICAL]: Ánh sáng, màu sắc (Lighting, Color).

        CẤU TRÚC PROMPT VIDEO (Video Motion Ai Prompt - Output String):
        [${style}], [Bối cảnh chi tiết], [CAMERA], [ACTION: Tên NV + Đặc điểm gốc + Hành động chi tiết. ${characters.length === 1 ? 'The scene contains EXACTLY ONE character' : 'Check logic'}], [Trang phục], [AUDIO/VOICE – LIP SYNC], [SPEECH SYNC], [TECHNICAL]

        CẤU TRÚC PROMPT ẢNH (Stable Image AI Prompt - Output String) - BẮT BUỘC CÓ:
        [${style}], [Bối cảnh chi tiết], [CAMERA], [ACTION: Tên NV + Đặc điểm gốc + Hành động chi tiết. ${characters.length === 1 ? 'The scene contains EXACTLY ONE character' : 'Check logic'}], [Trang phục], [TECHNICAL]

        TRẢ VỀ JSON Array các object:
        - action: [Tên các NV có mặt]: [Mô tả hành động]
        - voiceText: Lời thoại (nếu có)
        - motionPrompt: Prompt video (Tuân thủ cấu trúc trên)
        - imagePrompt: Prompt ảnh (Tuân thủ cấu trúc trên - KHÔNG ĐƯỢC RỖNG)
      `;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(result.response.text()) as ActionDetail[];
  });
};
